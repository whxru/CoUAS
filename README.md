# CoUAV

CoUAV is a platform which aims at effectively enabling the cooperation of multiple UAVs in a fleet. The major design targets of the proposed platform include:

1.  Provide a generic interface that can coordinate diversified UAVs by hiding their underlying hardware differences to facilitate the UAV development.
2.  Offer a set of core cooperation services to support quick design and deployment of multi-UAV applications.

The paper could be found [here](https://arxiv.org/abs/1904.04046)
The demo video could be found [here](https://www.youtube.com/watch?v=FC7hE3gI3ck)

## Overview

Currently the CoUAV platform is made up of monitor and GCS (Ground Control Software, in the form of python script on Raspberry Pi 3) for cluster of drones using MAVLink protocol.

The python script runs on the Raspberry Pi 3 to control the drone and the program of flight monitor on the ground. One single RPi is connected to one single drone's fight controller, every of the Pi and the Monitor should be on the same LAN and they communicate with [MAVC messages](/docs/mavc_message.md).

The script is the agent between monitor and one single drone, it receives commands sent by monitor to control the drone and reports the status of drone back. It is based on [DroneKit-Python](https://github.com/dronekit/dronekit-python) (the version of simulator) and [MAVProxy](https://github.com/ArduPilot/MAVProxy) (the version of real drone) since the drones we've got are all APM/Pixhawk copters, but you can rewrite the part of controller in  [drone_controller.py](/Pi/drone_controller.py) to run this script to control your own drones. If python 2.7 is not supported by your drones' SDK, you can still write a script yourself to communicate with the flight monitor as long as there's a way to combine the socket programming and control of drone into one single script (we put it on Raspberry Pi here).

The flight monitor is a desktop application built by [Electron](https://github.com/electron/electron), the plug-in of map is developed by [AutoNavi](https://lbs.amap.com/api/javascript-api/summary/). It can establish connections with drones in the cluster (actually the script on RPi) one after another and communicating with them to get status of each drone and send commands etc. One of the flight monitor's amazing features is that it allows developers to develop their own module. With interfaces we provided developers could easily create graphic window to interact with users and communicate with every drone in the cluster, it's a practical way to implement your ideas about multiple drones by deploying your own modules.

## Documentations

* [Real flight - Run CoUAV with real drone(s)](/docs/real_flight.md)
* [Simulation - Run CoUAV with simulator(s)](/docs/simulation.md)
* [Task file - How to describe a task and how it works](/docs/task_file.md)
* [User module - Make the monitor your own application](/docs/user_module.md)
* [API Reference - Functions used in user module](/docs/api.md)
* [Communication - Process of network communication between monitor and RPi's script](/docs/communication.md)
* [MAVC messages - Messages used in communication between monitor and RPi's script](docs/mavc_message.md)


