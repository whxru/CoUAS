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
from threading import Thread
import argparse

if __name__ == '__main__':
    # Parse arguments from the cmd line
    parser = argparse.ArgumentParser()
    parser.add_argument('--master', default='tcp:127.0.0.1:5760', help='String of connection')
    parser.add_argument('--host', default='172.20.10.4', help='IPv4 address where the monitor on')
    parser.add_argument('--port', default=4396, type=int, help='Port which the monitor are listening to')
    parser.add_argument('--sitl', type=int, help='Number of simulators to start')
    parser.add_argument('--lat', default=31.8871046, type=float, help='Latitude of home-location of the simulator')
    parser.add_argument('--lon', default=118.8134928, type=float, help='Longitude of home-location of the simulator')
    parser.add_argument('--baud', default=115200, type=int, help='Baudrate')
    args = parser.parse_args()
    connection_string = args.master
    host = args.host
    port = args.port
    baud = args.baud

    # To create and start simulators of copter
    sitl = None
    if args.sitl:
        sitls = []
        cnt_strs = []

        def connect_to_monitor(h, p, idx):
            sitls[idx-1][0].launch(sitls[idx-1][1], await_ready=True)
            vehicle = connect_vehicle(cnt_strs[idx-1])
            sitls[idx-1] = drone.Drone(vehicle, h, p, idx)

        # Preparation for starting multiple separated simulators
        from dronekit_sitl import SITL, start_default
        if args.sitl == 1:
            sitl = start_default(args.lat, args.lon)
            connection_string = sitl.connection_string()
            vehicle = connect_vehicle(connection_string)
            drone.Drone(vehicle, host, port)
        else:
            for i in range(0, args.sitl):
                sitl = SITL()
                sitl.download('copter', '3.3', verbose=True)
                sitl_args = ['-I%d' % i, '--model', 'quad', '--home=%f,%f,584,353' % (args.lat, args.lon)]
                sitls.append([sitl, sitl_args])
                cnt_strs.append('tcp:127.0.0.1:%d' % (5760 + 10*i))
                c = Thread(target=connect_to_monitor, args=(host, port, i+1), name="SITL_%d" % (i+1))
                c.start()
    else:
        # Connect to the Vehicle
        print("Connecting to vehicle on: %s" % connection_string)
        vehicle = connect_vehicle(connection_string, baud=baud)

        # Connect to the Monitor
        mav = drone.Drone(vehicle, host, port)

    try:
        while True:
            pass
    except KeyboardInterrupt:
        if not args.sitl:
            mav.close_connection()
        else:
            sitl.stop()
        print("Completed")
        exit(0)

