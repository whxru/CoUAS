#  -*- coding: utf-8 -*-

"""
Hello drone
~~~~~~~~~~~

This script runs on an raspberry Pi 3 which has connected to an Ardupilot(APM v2.6 to be tested).
It's the relay of communications between monitor on the ground and one of those drones in the sky.
"""

import dronekit
import dronekit_sitl
import socket
import exceptions
import thread
import Modules.connection as MC  # MC is short for Monitor Connection

# Connect to the Vehicle
sitl = dronekit_sitl.start_default()
connection_string = sitl.connection_string()
print("Connecting to vehicle on: %s" % (connection_string,))
try:
    vehicle = dronekit.connect(connection_string, heartbeat_timeout=15, wait_ready=True)
except socket.error:
    print 'No server exists!'
except exceptions.OSError as e:
    print 'No serial exists!'
except dronekit.APIException:
    print 'Timeout!'
except:
    print 'Some other error while connecting to the drone!'

# Connect to the Monitor
host = "127.0.0.1"
port = "6336"
mc = MC.Connection(host, port)
try:
    thread.start_new_thread(mc.report_to_monitor, ())
    thread.start_new_thread(mc.hear_from_monitor, ())
except:
    print "Error: unable to start new thread!"
    exit(0)


# Close vehicle object before exiting script
vehicle.close()

# Shut down simulator
sitl.stop()
print("Completed")