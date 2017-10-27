#  -*- coding: utf-8 -*-

"""
Modules.connection
~~~~~~~~~~~~~~~

* Manage one single drone state.
* Implement the methods for the communication between monitor and one single drone mainly through UDP protocol.
"""

import socket
import json

# Constant value definition of communication type
MAVC_REQ_CID = 0            # Request the Connection ID
MAVC_CID = 1                # Response to the ask of Connection ID
MAVC_REQ_STAT = 2           # Ask for the state of drone(s)
MAVC_STAT = 3               # Report the state of drone
MAVC_ARM_AND_TAKEOFF = 4    # Ask drone to arm and takeoff
MAVC_GO_TO = 5              # Ask drone to fly to target specified by latitude and longitude
MAVC_GO_BY = 6              # Ask drone to fly to target specified by the distance in both North and East directions

class Drone:
    """
        * Manage state of one single drone.
        * "Maintain" the connection between monitor and one single drone(actually the Raspberry Pi 3)
    """
    def __init__(self, CID):
        # Initialize private attributes
        self.__task_done = False    # Whether the task has been done
        self.__host = ''            # Host name of the Pi connected
        self.__state = {            # Information of state the drone connected
            'CID': CID,
            'Armed': False,
            'Mode': '',
            'Lat': 361,
            'Lon': 361,
            'Alt': 0
        }
        #
        self.__establish_connection()

    def __establish_connection(self):
        """Use port 4396 to handle the request of CID."""

        # Wait for the request of CID
        print('Waiting the request of CID...')
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.bind((socket.gethostbyname(socket.gethostname()), 4396))
        addr = ()
        while True:
            data_json, addr = s.recvfrom(1024)
            print(data_json)
            data_dict = json.loads(data_json)
            try:
                if data_dict[0]['Header'] == 'MAVCluster_Drone' and data_dict[0]['Type'] == MAVC_REQ_CID:
                    self.__host = addr[0]
                    print('The request of CID from IP address %s:%s has been received.' % (self.__host, addr[1]))
                    break
            except KeyError:
                continue

        # Send the CID back
        msg = [
            {
                'Header': 'MAVCluster_Monitor',
                'Type': MAVC_CID
            },
            {
                'CID': self.__state['CID']
            }
        ]
        s.sendto(json.dumps(msg), (addr[0], addr[1]))
        s.close()

    def __update_state(self, state_dict):
        """Deep copy of drone state.

        Args:
            state_dict: Dictionary of drone's state that monitor received from Raspberry Pi 3
        """

        for (key, value) in state_dict.items():
            self.__state[key] = value

    def get_pi_host(self):
        """Return the hostname of Pi connected"""
        return self.__host

    def listen_to_pi(self):
        """Keep listening the message sent from the Pi

        By default we use port 4396+CID on Monitor to handle the message from Pi.
        """

        print("Start listening to the Pi on %s:%s" % (socket.gethostbyname(socket.gethostname()), 4396+self.__state['CID']))
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.bind((socket.gethostbyname(socket.gethostname()), 4396+self.__state['CID']))
        while not self.__task_done:
            state_json, addr = s.recvfrom(1024)
            state_dict = json.loads(state_json)
            print(state_json)
            if not addr[0] == self.__host:  # The message is not sent from the Pi
                continue
            try:
                if state_dict[0]['Header'] == 'MAVCluster_Drone' and state_dict[0]['Type'] == MAVC_STAT:
                    self.__update_state(state_dict[1])
                    print(state_dict[1])
                    continue
            except KeyError:  # This message is not a MAVC message
                continue
        s.close()
