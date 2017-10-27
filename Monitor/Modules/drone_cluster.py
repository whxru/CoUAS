#  -*- coding: utf-8 -*-

"""
Module.drone_set
~~~~~~~~~~~~~~~~

Implement some methods to manage multiple drone connections.
"""

from connection import Drone
from threading import Thread
import socket
import json

# Constant value definition of communication type
MAVC_REQ_CID = 0     # Request the Connection ID
MAVC_CID = 1         # Response to the ask of Connection ID
MAVC_REQ_STAT = 2    # Ask for the state of drone(s)
MAVC_STAT = 3        # Report the state of drone
MAVC_GO_TO = 4       # Ask drone to fly to next target specified by latitude and longitude
MAVC_GO_BY = 5       # Ask drone to fly to next target specified by the distance in both North and East directions


class DroneCluster:
    """Management of mulitple drone connections."""

    def __init__(self):
        self.__port = 4396      # Port on Pi where the message will be sent to
        self.__drones = []      # List of drones

    def add_drone(self):
        """Add one single drone into the cluster

        1. New an instance of Drone (till we get the MAV_REQ_CID and the Pi's IP address)
        2. Generate a unique CID and send to the Pi
        3. Ask the instance to start keeping listening that the message Pi will send later
        """

        # Add the drone to the list
        drone = Drone()
        self.__drones.append(drone)

        # Generate CID and send it to the Pi
        CID = len(self.__drones) - 1
        msg = [
            {
                'Header': 'MAVCluster_Monitor',
                'Type': MAVC_CID
            },
            {
                'CID': CID
            }
        ]
        self.__send_msg_to_pi(drone.get_pi_host(), msg)

        # Start listeng to the message from the Pi
        t = Thread(target=drone.listen_to_pi, name='Drone %d Listener' % CID)
        t.start()

    def __send_msg_to_pi(self, host, msg):
        """Send message to the Pi specified by the hostname

        Args:
            host: Hostname of Pi
            msg: MAVC message
        """

        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.bind((host, self.__port))
        s.sendto(json.dumps(msg))

