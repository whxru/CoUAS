#  -*- coding: utf-8 -*-

"""
Modules.connection
~~~~~~~~~~~~~~~

Implement the methods for the communication between monitor and drone mainly through UDP protocol.

The message should follow the example below (we will call it "MAVC message later"):
[
    {
        'Header‘: 'MAVCluster_Drone',   # or 'MAVCluster_Monitor'
        'Type': MAVC_REQ_CID            # values defined later
    },
    # If the value of 'Type' begins with 'MAVC_REQ_',then the message should contain the information above only

    # Type = MAVC_CID
    {
        'CID' : 1
    }

    # Type = MAVC_STAT
    {
        'CID' : 2,
        'Armed': True,      # Is armed or not
        'Mode': 'Guided',   # Flight mode that the drone currently in
        'Lat' : 38.13421,   # Latitude
        'Lon' : -114.31341, # Longitude
        'Alt' : 4           # Altitude(meters)
    }
    # Type = MAVC_GO_TO
    {
        'CID': 3,
        'Lat': 38.11523,
        'Lon': -118.53556,
        'Alt': 5,
        'Time': 3           # Time limit(seconds)
    },...

    # Type = MAVC_GO_BY
    {
        'CID': 3,
        'N': 3,             # Distance in North direction(meters)
        'E': 5,             # Distance in East direction(meters)
        'Alt': 5,           # Altitude(meters)
        'Time': 3           # Time limit(seconds)
    },...
]
"""
import dronekit
import time
import socket, json
from threading import Thread,Timer

# Constant value definition of communication type
MAVC_REQ_CID = 0     # Request the Connection ID
MAVC_CID = 1         # Response to the ask of Connection ID
MAVC_REQ_STAT = 2    # Ask for the state of drone(s)
MAVC_STAT = 3        # Report the state of drone
MAVC_GO_TO = 4       # Ask drone to fly to next target specified by latitude and longitude
MAVC_GO_BY = 5       # Ask drone to fly to next target specified by the distance in both North and East directions


class Connection:
    """Maintain an connection between the drone and monitor."""
    def __init__(self, vehicle, host, port):
        self.__host = host
        self.__port = port
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
        msg = [
            {
                'Header': 'MAVCluster_Drone',
                'Type': MAVC_REQ_CID
            }
        ]
        s = self.send_msg_to_monitor(msg)

        # Listen to the monitor to get CID
        while True:
            data_str, addr = s.recvfrom(1024)
            if not addr['ipaddr'] == self.__host:  # This message is not sent from the Monitor
                continue

            data_dict = json.loads(data_str)
            try:
                if data_dict[0]['Header'] == 'MAVCluster_Monitor' and data_dict[0]['Type'] == MAVC_CID:
                    self.__CID = data_dict[0]
                    print 'Receive the CID from %s:%s' % (addr['ipaddr'], addr['port'])
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
                    'Mode': self.__vehicle.mode,
                    'Lat': location.lat,
                    'Lon': location.lon,
                    'Alt': location.alt
                }
            ]
            self.send_msg_to_monitor(state)
            if not self.__task_done:
                t = Timer(1, send_state_to_monitor)
                t.start()

        t = Timer(1, send_state_to_monitor)
        t.start()

    def send_msg_to_monitor(self, msg):
        """Send message to monitor

        Args:
            msg: MAVC message
        """

        msg = json.dumps(msg)
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.bind((self.__host, self.__port))
        s.sendto(msg)
        print(msg)
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