#  -*- coding: utf-8 -*-

"""
Modules.drone
~~~~~~~~~~~~~

Implement the methods for the communication between monitor and drone mainly through UDP protocol.
"""
import math
import socket, json
from drone_controller import *
from threading import Thread, Timer

# Constant value definition of communication type
MAVC_REQ_CID = 0            # Request the Connection ID
MAVC_CID = 1                # Response to the ask of Connection ID
MAVC_STAT = 2               # Report the state of drone
MAVC_SET_GEOFENCE = 3       # Set geofence of the drone
MAVC_ACTION = 4             # Action to be performed
MAVC_ARRIVED = 5            # Tell the monitor that the drone has arrived at the target

# Constant value definition of action type in MAVC_ACTION message
ACTION_ARM_AND_TAKEOFF = 0  # Ask drone to arm and takeoff
ACTION_GO_TO = 1            # Ask drone to fly to next target specified by latitude and longitude
ACTION_GO_BY = 2            # Ask drone to fly to next target specified by distance in both North and East directions
ACTION_LAND = 3          # Ask drone to land at current or a specific location


class Drone:
    """Maintain an connection between the drone and monitor."""
    def __init__(self, vehicle, host, port, index=1):
        self.__host = host          # The host of Monitor
        self.__port = port+index    # The port of Monitor
        self.__index = index        # To decide which port to bind for MAVC_REQ
        self.__CID = -1             # Connection ID used to identify specific the drone.
        self.__task_done = False    # Indicate that whether the connection should be closed
        self.__action_queue = []    # Queue of actions
        self.__vehicle = vehicle
        self.__sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.__establish_connection()

    def __establish_connection(self):
        """
        Once the main process has connected to the drone successfully, this method will be called to initialize the
        drone state in the monitor process, then they should "maintain" the connection identified by an unique ID
        till all tasks are done and the drone has landed safely.

        Currently we use UDP protocol to communicate.

        To-do:
            Resend MAVC_REQ_CID message while there's no response from the monitor for a long time
        """

        # Send msg to monitor to ask CID
        home = self.__vehicle.location.global_relative_frame
        msg = [
            {
                'Header': 'MAVCluster_Drone',
                'Type': MAVC_REQ_CID
            },
            {
                'Lat': home.lat,
                'Lon': home.lon
            }
        ]
        s = self.send_msg_to_monitor(msg)

        # Listen to the monitor to get CID
        while True:
            data_json, addr = s.recvfrom(1024)
            print(data_json)
            if not addr[0] == self.__host:  # This message is not sent from the Monitor
                continue

            data_dict = json.loads(data_json)
            try:
                if data_dict[0]['Header'] == 'MAVCluster_Monitor' and data_dict[0]['Type'] == MAVC_CID:
                    self.__CID = data_dict[1]['CID']
                    self.__port = self.__port - self.__index + self.__CID
                    s.close()
                    # Build TCP connection to monitor
                    self.__sock.connect((self.__host, self.__port))
                    print 'Drone-%d receives the CID from %s:%s' % (self.__CID, addr[0], addr[1])
                    break
            except KeyError:  # This message is not a MAVC message
                continue

        # Start listening and reporting
        try:
            report = Thread(target=self.__report_to_monitor, name='Report-To-Monitor')
            hear = Thread(target=self.__listen_to_monitor, name='Hear-From-Monitor')
            execute = Thread(target=self.__perform_actions, name='Execute-Tasks-In-Queue')
            report.start()
            hear.start()
            execute.start()
        except:
            print "Error: unable to start new thread!"
            exit(0)

    def __report_to_monitor(self):
        """Report the states of drone to the monitor on time while task hasn't done."""
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        print "Drone-%d starts reporting to the monitor" % self.__CID

        t = None

        def send_state_to_monitor():
            """Get current state of drone and send to monitor"""
            location = self.__vehicle.location.global_relative_frame
            state = [
                {
                    'Header': 'MAVCluster_Drone',
                    'Type': MAVC_STAT
                },
                {
                    'CID': self.__CID,
                    'Armed': self.__vehicle.armed,
                    'Mode': self.__vehicle.mode.name,
                    'Lat': location.lat,
                    'Lon': location.lon,
                    'Alt': location.alt
                }
            ]
            s = self.send_msg_to_monitor(state)
            if not self.__task_done:
                t = Timer(1, send_state_to_monitor)
                t.start()

        t = Timer(1, send_state_to_monitor)
        t.start()

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
        return s  # Return the socket in case the caller function need to call s.recvfrom() later

    def write_data_to_monitor(self, data):
        """Send data to monitor using TCP protocol

        Args:
            data: MAVC message.
        """
        self.__sock.send(json.dumps(data))

    def __listen_to_monitor(self):
        """Deal with instructions sent by monitor.

        Keep listening the message sent by monitor, once messages arrived this method will push the specified actions
        sent from monitor into a queue and perfome them one by one in another thread.
        """

        buf = ''
        # Listen to the monitor
        while not self.__task_done:
            data_json = self.__sock.recv(1024)
            print(data_json)

            buf += data_json
            # Not a complete message yet
            if not data_json.endswith('$$'):
                continue
            # A complete message has been received
            data_dict = json.loads(buf[:-2])
            buf = ''
            try:
                if data_dict[0]['Header'] == 'MAVCluster_Monitor':
                    mavc_type = data_dict[0]['Type']
                    handler = Thread(target=self.__msg_handler, args=(mavc_type, data_dict))
                    handler.start()

            except KeyError:  # This message is not a MAVC message
                continue

    def __msg_handler(self, mavc_type, *opargs):
        """Handle the message received from monitor

        Args:
            mavc_type: Type of MAVC message.
            opargs: Optional arguments.
                [1] data_dict: Dictionary of MAVC message received.
                [2] subtask_actions: Temporary list for subtask reconstruction.
        """

        def mavc_action(args):
            """Perform action."""
            data_dict = args[0]
            for n in range(1, len(data_dict)):
                # Pick actions about this drone out
                CID = data_dict[n]['CID']
                if CID == self.__CID:
                    del data_dict[n]['CID']
                    self.__action_queue.append(data_dict[n])

        def mavc_set_geofence(args):
            """Set the geofence of drone."""
            data_dict = args[0]
            self.__set_geofence(data_dict[1])

        # Handle MAVC message
        handler = {
            MAVC_ACTION: mavc_action,
            MAVC_SET_GEOFENCE: mavc_set_geofence
        }
        handler[mavc_type](opargs)

    def __perform_actions(self):
        """perform actions from the queue. """

        while not self.__task_done:
            perform_action = {
                ACTION_ARM_AND_TAKEOFF: arm_and_takeoff,
                ACTION_GO_TO: go_to,
                ACTION_GO_BY: go_by,
                ACTION_WAIT: wait,
                ACTION_LAND: land_at
            }

            if len(self.__action_queue) > 0:
                # Choose the first action
                action = self.__action_queue.pop(0)
                # Perform the action
                sync = action['Sync']
                step = action['Step']
                action_type = action['Action_type']
                del action['Sync']
                del action['Step']
                del action['Action_type']
                perform_action[action_type](self.__vehicle, action)
                # Report the end of the action if needed
                if sync:
                    self.write_data_to_monitor([
                        {
                            'Header': 'MAVCluster_Drone',
                            'Type': MAVC_ARRIVED
                        },
                        {
                            'CID': self.__CID,
                            'Step': step
                        }
                    ])

    def __set_geofence(self, args):
        """Set Geofence of the drone

        Args:
            args: Dictionary of parameters
                radius: Radius of circle(meters).
                lat: Latitude of center.
                lon: Longitude of center.
        """

        # Get parameters
        radius = args['Radius']
        lat = args['Lat']
        lon = args['Lon']

        # Monitor the location of drone in case of escaping
        def monitor_escaping():
            while not self.__task_done:
                # Calculate the distance
                current_location = self.__vehicle.location.global_relative_frame
                d_lat = current_location.lat - lat
                d_lon = current_location.lon - lon
                distance = math.sqrt((d_lat * d_lat) + (d_lon * d_lon)) * 1.113195e5
                # Almost exceed the borderand
                if distance + 0.1 > radius:
                    # empty the action queue
                    self.__action_queue = []
                    # return to launch
                    self.__vehicle.message_factory.command_long_send(
                        0, 0,  # target_system, targe_component
                        20,  # MAV_CMD_NAV_RETURN_TO_LAUNCH
                        0,  # confirmation
                        0, 0, 0, 0, 0, 0, 0,  # param 1~7: not used
                    )

        # Monitor in a new thread
        work = Thread(target=monitor_escaping, name='Monitor_escaping')
        work.start()

    def close_connection(self):
        """Close the connection that maintained by the instance

        Returns:
            A boolean variable that indicate whether the connection closed successfully.
        """
        self.__task_done = True

        if self.__vehicle.armed:
            land_at(self.__vehicle, {
                'Lat': 0,
                'Lon': 0
            })

        self.__vehicle.close()