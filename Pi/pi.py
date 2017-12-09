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

if __name__ == '__main__':
    # Parse arguments from the cmd line
    parser = argparse.ArgumentParser()
    parser.add_argument('--master', default='tcp:127.0.0.1:5760', help='String of connection')
    parser.add_argument('--host', default='172.20.10.4', help='IPv4 address where the monitor on')
    parser.add_argument('--port', default=4396, type=int, help='Port which the monitor are listening to')
    parser.add_argument('--sitl', action='store_true', help='To start with a simulator of drone')
    parser.add_argument('--lat', default=31.8872318, type=float, help='Latitude of home-location of the simulator')
    parser.add_argument('--lon', default=118.8193952, type=float, help='Longitude of home-location of the simulator')
    args = parser.parse_args()
    connection_string = args.master
    host = args.host
    port = args.port

    # To create a simulator of copter
    if args.sitl:
        from dronekit_sitl import start_default
        sitl = start_default(args.lat, args.lon)
        connection_string = sitl.connection_string()

    # Connect to the Vehicle
    print("Connecting to vehicle on: %s" % connection_string)
    vehicle = connect_vehicle(connection_string)

    # Connect to the Monitor
    mav = drone.Drone(vehicle, host, port)

    try:
        while True:
            pass
    except KeyboardInterrupt:
        mav.close_connection()
        print("Completed")
        exit(0)

