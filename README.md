# CoUAV

Monitor and GCS (on Raspberry Pi 3) for cluster of drones using MAVLink protocol.

## Overview

MAVCluster contains the python script runs on the Raspberry Pi 3 to control the drone and the program of monitor on the ground. One single Pi is connected to one single APM copter's fight controller, every of the Pi and the Monitor should be on the same LAN and they communicate with [MAVC messages](/docs/mavc_message.md).

The script is the agent between monitor and one single drone, it receives commands sent by monitor to control the drone and reports the state of drone back. It is based on [DroneKit-Python](https://github.com/dronekit/dronekit-python) (the version of simulator)and [MAVProxy](https://github.com/ArduPilot/MAVProxy) (the version of real drone) since the drones we've got are all APM/Pixhawk copters, but you can rewrite the part of controller in  [drone_controller.py](/Pi/drone_controller.py) to run this script to control your own drones. If python 2.7 is not supported by your drones' SDK, you can still write a script yourself to communicate with our Monitor as long as there's a way to combine the socket programming and control of drone into one single script(we use Raspberry Pi here).

The monitor is a desktop application built by [Electron](https://github.com/electron/electron), the plug-in of map is developed by [高德开发平台](https://lbs.amap.com/api/javascript-api/summary/). The monitor can receive requests of connection one after another and broadcast commands(e.g. task execution or setting geofence).

## Documentations

* [Real flight - Run CoUAV on real drone(s)](/docs/real_flight.md)
* [Simulation - Run CoUAV on simulator(s)](/docs/simulation.md)
* [Task file - Description of a task](/docs/task_file.md)
* [Communication - To develop your own script on RPi](/docs/communication.md)


