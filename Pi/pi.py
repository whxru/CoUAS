#  -*- coding: utf-8 -*-

"""
Hello drone
~~~~~~~~~~~

This script runs on an raspberry Pi 3 which has connected to an Ardupilot(APM v2.6 to be tested).
It's the relay of communications between monitor on the ground and one of those drones in the sky.

To start a simulator drone in SEU: dronekit-sitl copter-3.3 --home=31.8872318,118.8193952,5,353
"""

from Modules import drone
from Modules.drone_controller import connect_vehicle
import argparse

# Parse arguments from the cmd line
parser = argparse.ArgumentParser()
parser.add_argument('-m', '--master', default='tcp:127.0.0.1:5760', help='String of connection')
parser.add_argument('--host', default='172.20.10.4', help='IPv4 address where the monitor on')
parser.add_argument('--port', default=4396, type=int, help='Port which the monitor are listening to')
args = parser.parse_args()
connection_string = args.master
host = args.host
port = args.port

# Connect to the Vehicle
print("Connecting to vehicle on: %s" % (connection_string,))
vehicle = connect_vehicle(connection_string)

# Connect to the Monitor
mav = drone.Drone(vehicle, host, port)

while True:
    pass
# Close vehicle object before exiting script
vehicle.close()

# Shut down simulator
print("Completed")