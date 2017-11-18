#  -*- coding: utf-8 -*-

"""
Hello drone
~~~~~~~~~~~

This script runs on an raspberry Pi 3 which has connected to an Ardupilot(APM v2.6 to be tested).
It's the relay of communications between monitor on the ground and one of those drones in the sky.
"""

import Modules.drone as drone
from Modules.drone_controller import connect_vehicle

# Connect to the Vehicle
# To start a simulator drone in SEU: dronekit-sitl copter-3.3 --home=31.8872318,118.8193952,5,353
connection_string = 'tcp:127.0.0.1:5760'
print("Connecting to vehicle on: %s" % (connection_string,))
vehicle = connect_vehicle(connection_string)

# Connect to the Monitor
host = "172.20.10.5"
port = 4396
mav = drone.Drone(vehicle, host, port)

while True:
    pass
# Close vehicle object before exiting script
vehicle.close()

# Shut down simulator
print("Completed")