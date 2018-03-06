import socket
import json
import math
import time

from MAVProxy.modules.lib import mp_module
from threading import Thread, Timer
from pymavlink import mavutil


class MAVNode(mp_module.MPModule):
    # Constant value definition of communication type
    MAVC_REQ_CID = 0  # Request the Connection ID
    MAVC_CID = 1  # Response to the ask of Connection ID
    MAVC_STAT = 2  # Report the state of drone
    MAVC_SET_GEOFENCE = 3  # Set geofence of the drone
    MAVC_ACTION = 4  # Action to be performed
    MAVC_ARRIVED = 5  # Tell the monitor that the drone has arrived at the target

    # Constant value definition of action type in MAVC_ACTION message
    ACTION_ARM_AND_TAKEOFF = 0  # Ask drone to arm and takeoff
    ACTION_GO_TO = 1  # Ask drone to fly to next target specified by latitude and longitude
    ACTION_GO_BY = 2  # Ask drone to fly to next target specified by distance in both North and East directions
    ACTION_LAND = 3  # Ask drone to land at current or a specific location

    def __init__(self, mpstate):
        super(MAVNode, self).__init__(mpstate, "MAVNode", "Node of MAVCluster")

        self.__CID = -1
        self.__host = None
        self.__port = 4396
        self.__done = False
        self.__sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.__wp_str = None
        self.__msg_handler = {
            MAVNode.MAVC_SET_GEOFENCE: self.msg_set_geofence,
            MAVNode.MAVC_ACTION: self.msg_action
        }
        self.__action_handler = {
            MAVNode.ACTION_ARM_AND_TAKEOFF: self.action_arm_and_takeoff,
            MAVNode.ACTION_GO_BY: self.action_go_by,
            MAVNode.ACTION_GO_TO: self.action_go_to,
            MAVNode.ACTION_LAND: self.action_land
        }

        self.add_command('node-connect', self.cmd_connect, "Connect to monitor via IP address")

    def cmd_connect(self, args):
        """node-connect command"""
        usage = "usage: node-connect <public_ip of monitor>"

        if len(args) <= 0:
            print(usage)
            return

        if not self.is_ipv4_addr(args[0]):
            print("Correct IPv4 address required")
            return

        self.__host = args[0]

        # Request for CID
        home = self.master.messages['GLOBAL_POSITION_INT']
        s = self.send_msg_to_monitor([
            {
                'Header': 'MAVCluster_Drone',
                'Type': MAVNode.MAVC_REQ_CID
            },
            {
                'Lat': home.lat * 1.0e-7,
                'Lon': home.lon * 1.0e-7
            }
        ])

        # Listen to the monitor to get CID
        while True:
            data_json, addr = s.recvfrom(1024)
            print(data_json)
            if not addr[0] == self.__host:  # This message is not sent from the Monitor
                continue

            data_dict = json.loads(data_json)
            try:
                if data_dict[0]['Header'] == 'MAVCluster_Monitor' and data_dict[0]['Type'] == MAVNode.MAVC_CID:
                    self.__CID = data_dict[1]['CID']
                    self.__port = self.__port + self.__CID
                    s.close()
                    # Build TCP connection to monitor
                    self.__sock.connect((self.__host, self.__port))
                    break
            except KeyError:  # This message is not a MAVC message
                continue

        # Battery failsafe
        self.module('param').cmd_param(['set', 'FS_BATT_ENABLE', '2'])
        # Restart mission when switch to AUTO again
        self.module('param').cmd_param(['set', 'MIS_RESTART', '1'])

        # Start listening and reporting
        Thread(target=self.__listen_to_monitor, name='Hear-From-Monitor').start()
        self.__report_to_monitor()

    def msg_set_geofence(self, *args):
        """Handle the msg of set_geofence"""
        pass

    def msg_action(self, *args):
        """Handle the msg of action"""
        self.mode('GUIDED')
        while not self.master.flightmode == 'GUIDED':
            pass
        self.master.waypoint_clear_all_send()
        self.module('wp').wploader.clear()

        data_dict = args[0]
        print(json.dumps(data_dict))
        cmd_num = 0
        pos = self.master.messages['GLOBAL_POSITION_INT']
        pos = {
            'lat': pos.lat * 1.0e-7,
            'lon': pos.lon * 1.0e-7,
            'alt': pos.relative_alt * 1.0e-3
        }
        for n in range(1, len(data_dict)):
            # Pick actions about this drone out
            if data_dict[n]['CID'] == self.__CID:
                action = data_dict[n]
                # Perform the action
                action_type = action['Action_type']
                action['O'] = pos
                pos = self.__action_handler[action_type](action)
                cmd_num += 1

        # Add dummy command if needed
        land_finally = data_dict[-1]['Action_type'] == MAVNode.ACTION_LAND
        if not land_finally:
            fn = mavutil.mavlink.MAVLink_mission_item_message
            wp = fn(0, 0, 0, mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT, mavutil.mavlink.MAV_CMD_NAV_LOITER_UNLIM, 0, 0,
                    0, 0, 0, 0, 0, 0, 0)
            self.module('wp').wploader.add(wp)
            cmd_num += 1

        # Upload the mission to APM board
        self.module('wp').save_waypoints('wp.txt')
        self.module('wp').send_all_waypoints()
        while self.module('wp').loading_waypoints:
            pass

        # Start mission
        self.mode('AUTO')

        # Block until the end of mission
        while not self.module('wp').last_waypoint == cmd_num - 1:
            pass

        if land_finally:
            self.mode('LAND')
            
        # Send report back if needed
        if data_dict[-1]['Sync']:
            self.__sock.send(json.dumps([
                {
                    'Header': 'MAVCluster_Drone',
                    'Type': MAVNode.MAVC_ARRIVED
                },
                {
                    'CID': self.__CID,
                    'Step': data_dict[-1]['Step']
                }
            ]))

    def action_arm_and_takeoff(self, args):
        """Arm and takeoff"""
        alt = args['Alt']

        # Change mode to GUIDED
        self.mode('GUIDED')
        while not self.master.flightmode == 'GUIDED':
            pass
        print("Mode GUIDED")

        # Arm throttle
        self.master.arducopter_arm()
        while not self.master.motors_armed():
            time.sleep(0.7)

        # Takeoff
        self.master.mav.command_long_send(
            self.settings.target_system,  # target_system
            mavutil.mavlink.MAV_COMP_ID_SYSTEM_CONTROL,  # target_component
            mavutil.mavlink.MAV_CMD_NAV_TAKEOFF,  # command
            0,  # confirmation
            0,  # param1
            0,  # param2
            0,  # param3
            0,  # param4
            0,  # param5
            0,  # param6
            float(alt))  # param7
        while True:
            current_alt = self.master.messages['GLOBAL_POSITION_INT'].relative_alt * 1.0e-3
            print("Altitude: %f" % current_alt)
            if current_alt >= alt * 0.8:
                break
            time.sleep(0.7)

        # Add waypoint
        fn = mavutil.mavlink.MAVLink_mission_item_message
        wp = fn(0, 0, 0, mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT, mavutil.mavlink.MAV_CMD_NAV_TAKEOFF, 0, 0,
                0, 0, 0, 0, 0, 0, alt)
        self.module('wp').wploader.add(wp)

        pos = self.master.messages['GLOBAL_POSITION_INT']
        return {
            'lat': pos.lat * 1.0e-7,
            'lon': pos.lon * 1.0e-7,
            'alt': pos.alt * 1.0e-3
        }

    def action_go_by(self, args):
        """Add go_by waypoint to file of mission"""
        d_north = args['N']
        d_east = args['E']
        alt = args['Alt']
        current_location = args['O']
        target_location = get_location_metres(current_location, d_north, d_east)

        # Add waypoint
        fn = mavutil.mavlink.MAVLink_mission_item_message
        wp = fn(0, 0, 0, mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT, mavutil.mavlink.MAV_CMD_NAV_WAYPOINT, 0, 0,
                0, 0, 0, 0, target_location['lat'], target_location['lon'], alt)
        self.module('wp').wploader.add(wp)

        return {
            'lat': target_location['lat'],
            'lon': target_location['lon'],
            'alt': alt
        }

    def action_go_to(self, args):
        """Add go_to waypoint to file of mission"""
        lat = args['Lat']
        lon = args['Lon']
        alt = args['Alt']

        # Add waypoint
        fn = mavutil.mavlink.MAVLink_mission_item_message
        wp = fn(0, 0, 0, mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT, mavutil.mavlink.MAV_CMD_NAV_WAYPOINT, 0, 0,
                0, 0, 0, 0, lat, lon, alt)
        self.module('wp').wploader.add(wp)

        return {
            'lat': lat,
            'lon': lon,
            'alt': alt
        }

    def action_land(self, args):
        """Add land waypoint to file of mission"""
        lat = args['Lat']
        lon = args['Lon']
        pos = args['O']

        # Add waypoint
        fn = mavutil.mavlink.MAVLink_mission_item_message
        (lat, lon) = (pos['lat'], pos['lon']) if lat == 0 else (lat, lon)
        wp = fn(0, 0, 0, mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT, mavutil.mavlink.MAV_CMD_NAV_WAYPOINT, 0, 0,
                0, 0, 0, 0, lat, lon, pos['alt'])
        self.module('wp').wploader.add(wp)

        return {}

    def mode(self, md):
        """set arbitrary mode"""
        mode_mapping = self.master.mode_mapping()
        if mode_mapping is None:
            print('No mode mapping available')
            return
        if md.isdigit():
            modenum = int(md)
        else:
            mode = md.upper()
            if mode not in mode_mapping:
                print('Unknown mode %s: ' % mode)
                return
            modenum = mode_mapping[mode]
        self.master.set_mode(modenum)

    def send_msg_to_monitor(self, msg):
        """Send message to monitor using UDP protocol.

        By Deafult we use port 4396 on Monitor to handle the request of CID and port 4396+cid to handle other
        messages from the the Pi whose CID=cid.

        Args:
            msg: MAVC message.
        """

        msg = json.dumps(msg)
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.sendto(msg, (self.__host, self.__port))
        return s

    def __report_to_monitor(self):
        """Report the states of drone to the monitor on time while task hasn't done."""
        location = self.master.messages['GLOBAL_POSITION_INT']
        state = [
            {
                'Header': 'MAVCluster_Drone',
                'Type': MAVNode.MAVC_STAT
            },
            {
                'CID': self.__CID,
                'Armed': self.master.motors_armed(),
                'Mode': self.master.flightmode,
                'Lat': location.lat * 1.0e-7,
                'Lon': location.lon * 1.0e-7,
                'Alt': location.relative_alt * 1.0e-3
            }
        ]
        self.send_msg_to_monitor(state)
        if not self.__done:
            Timer(0.5, self.__report_to_monitor).start()

    def __listen_to_monitor(self):
        """Deal with instructions sent by monitor.

        Keep listening the message sent by monitor, once messages arrived this method will push the specified actions
        sent from monitor into a queue and perfome them one by one in another thread.
        """

        buf = ''
        # Listen to the monitor
        try:
            while not self.__done:
                data_json = self.__sock.recv(1024)
                print(data_json)

                buf += data_json
                # Not a complete message yet
                if not buf.endswith('$$'):
                    continue
                # A complete message has been received
                data_dict = json.loads(buf[:-2])
                buf = ''
                try:
                    if data_dict[0]['Header'] == 'MAVCluster_Monitor':
                        mavc_type = data_dict[0]['Type']
                        Thread(target=self.__msg_handler[mavc_type], args=(data_dict,)).start()
                except KeyError:  # This message is not a MAVC message
                    continue
        except socket.error:
            self.close_connection()

    def close_connection(self):
        """Close the connection that maintained by the instance"""
        self.__done = True
        if self.master.motors_armed():
            self.mode("RTL")

    @staticmethod
    def is_ipv4_addr(str):
        """To determin whether the string is an IPv4 address"""
        if str is not None:
            return True


def get_location_metres(original_location, d_north, d_east):
    """
    Returns a LocationGlobal object containing the latitude/longitude `d_north` and `d_east` metres from the
    specified `original_location`. The returned LocationGlobal has the same `alt` value
    as `original_location`.

    The function is useful when you want to move the vehicle around specifying locations relative to
    the current vehicle position.

    The algorithm is relatively accurate over small distances (10m within 1km) except close to the poles.

    For more information see:
    http://gis.stackexchange.com/questions/2951/algorithm-for-offsetting-a-latitude-longitude-by-some-amount-of-meters

    """

    earth_radius = 6378137.0  # Radius of "spherical" earth
    # Coordinate offsets in radians
    dLat = d_north / earth_radius
    dLon = d_east / (earth_radius * math.cos(math.pi * original_location['lat'] / 180))

    # New position in decimal degrees
    new_lat = original_location['lat'] + (dLat * 180 / math.pi)
    new_lon = original_location['lon'] + (dLon * 180 / math.pi)
    return {
        'lat': new_lat,
        'lon': new_lon,
        'alt': original_location['alt']
    }


def get_distance_metres(location1, location2):
    """
    Returns the ground distance in metres between two LocationGlobal objects.

    This method is an approximation, and will not be accurate over large distances and close to the
    earth's poles. It comes from the ArduPilot test code:
    https://github.com/diydrones/ardupilot/blob/master/Tools/autotest/common.py
    """

    d_lat = location2['lat'] - location1['lat']
    d_lon = location2['lon'] - location1['lon']
    return math.sqrt((d_lat*d_lat) + (d_lon*d_lon)) * 1.113195e5


def init(mpstate):
    """Initialize module"""
    return MAVNode(mpstate)
