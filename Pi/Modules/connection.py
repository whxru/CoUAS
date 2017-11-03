#  -*- coding: utf-8 -*-

"""
Modules.connection
~~~~~~~~~~~~~~~

Implement the methods for the communication between monitor and drone mainly through UDP protocol.
"""
import dronekit
import time
import socket, json
from threading import Thread,Timer

# Constant value definition of communication type
MAVC_REQ_CID = 0            # Request the Connection ID
MAVC_CID = 1                # Response to the ask of Connection ID
MAVC_REQ_STAT = 2           # Ask for the state of drone(s)
MAVC_STAT = 3               # Report the state of drone
MAVC_ARM_AND_TAKEOFF = 4    # Ask drone to arm and takeoff
MAVC_GO_TO = 5              # Ask drone to fly to target specified by latitude and longitude
MAVC_GO_BY = 6              # Ask drone to fly to target specified by the distance in both North and East directions


class Connection:
    """Maintain an connection between the drone and monitor."""
    def __init__(self, vehicle, host, port):
        self.__host = host          # The host of Monitor
        self.__port = port          # The port of Monitor
        self.__CID = -1             # Connection ID used to identify specific the drone.
        self.__task_done = False    # Indicate that whether the connection should be closed
        self.__vehicle = vehicle
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
        print('Start listening to the report of CID request')
        while True:
            data_json, addr = s.recvfrom(1024)
            print(data_json)
            if not addr[0] == self.__host:  # This message is not sent from the Monitor
                continue

            data_dict = json.loads(data_json)
            try:
                if data_dict[0]['Header'] == 'MAVCluster_Monitor' and data_dict[0]['Type'] == MAVC_CID:
                    self.__CID = data_dict[1]['CID']
                    self.__port = self.__port + self.__CID
                    s.close()
                    print 'Receive the CID from %s:%s' % (addr[0], addr[1])
                    break
            except KeyError:  # This message is not a MAVC message
                continue

        # Start listening and reporting
        try:
            report = Thread(target=self.__report_to_monitor, name='Report-To-Monitor')
            hear = Thread(target=self.__listen_to_monitor, name='Hear-From-Monitor')
            report.start()
            hear.start()
        except:
            print "Error: unable to start new thread!"
            exit(0)

    def __report_to_monitor(self):
        """Report the states of drone to the monitor on time while task hasn't done."""
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        print "Start reporting to the monitor"

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
        """Send message to monitor

        By Deafult we use port 4396 on Monitor to handle the request of CID and port 4396+cid to handle other
        messages from the the Pi whose CID=cid.

        Args:
            msg: MAVC message
        """

        msg = json.dumps(msg)
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.sendto(msg, (self.__host, self.__port))
        return s  # Return the socket in case the caller function need to call s.recvfrom() later

    def __listen_to_monitor(self):
        """Deal with instructions sent by monitor.

        Keeping listening to the monitor, once messages arrived this method will start analyzing and translate them into
        the form that other modules can handle.

        Returns: Dictionary that can be parsed by command execution module.
        """

    def close_connection(self):
        """Close the connection that maintained by the instance

        Returns:
            A boolean variable that indicate whether the connection closed successfully.
        """