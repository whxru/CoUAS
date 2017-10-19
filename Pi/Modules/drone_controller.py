#  -*- coding: utf-8 -*-

"""
Modules.drone_controller
~~~~~~~~~~~~~~~~~~~~~~~~

Package some drone commands as the safety of drone and correctness of tasks considered.
"""

import dronekit
import socket
import exceptions
import time
import math
from threading import Timer


def connect_vehicle(connection_string):
    """Connect to the vehicle through the connection string

    Args:
        connection_string: It contains address to be connected and some connection options

    Returns:
        An object from which you can get/set parameters and attributes, and control vehicle movement.
    """

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
    else:
        return vehicle


def arm_and_takeoff(vehicle, altitude):
    """Arms vehicle and fly to the altitude.

    Args:
        vehicle: Object of drone.
        altitude: The height which the drone should arrive at after the taking off.
    """

    # Don't try to arm until autopilot is ready
    print "Basic pre-arm checks"
    while not vehicle.is_armable:
        print " Waiting for vehicle to initialise..."
        time.sleep(1)

    # Copter should arm in GUIDED mode
    print "Arming motors"
    vehicle.mode = dronekit.VehicleMode("GUIDED")
    vehicle.armed = True

    # Confirm vehicle armed before attempting to take off
    while not vehicle.armed:
        print " Waiting for arming..."
        time.sleep(1)

    print "Taking off!"
    vehicle.simple_takeoff(altitude)  # Take off to target altitude

    # Wait until the vehicle reaches a safe height before processing the goto (otherwise the command
    #  after Vehicle.simple_takeoff will execute immediately).
    while True:
        # print " Altitude: ", vehicle.location.global_relative_frame.alt
        # Break and return from function just below target altitude.
        if vehicle.location.global_relative_frame.alt >= altitude * 0.95:
            print "Reached target altitude"
            break
        time.sleep(1)


def go_to(vehicle, dNorth, dEast):
    """Make an movement of drone according to the distance at North and East inputted

    We think that the drone has arrived the target position when the remaining distance decreases to a so small
    value that we can ignore it. There isn't any callback function provided since the script runs synchronously,
    but it can be added easily if needed one day.

    Args:
        vehicle: Object of drone.
        dNorth: Distance at North direction
        dEast: Distance at East direction
    """

    current_location = vehicle.location.global_relative_frame
    target_location = get_location_metres(current_location, dNorth, dEast)
    target_distance = get_distance_metres(current_location, target_location)
    vehicle.simple_goto(target_location)

    while vehicle.mode.name == "GUIDED":  # Stop action if we are no longer in guided mode.
        remaining_distance = get_distance_metres(vehicle.location.global_frame, target_location)
        print "Distance to target: ", remaining_distance
        if remaining_distance <= target_distance * 0.01:  # Just below target, in case of undershoot.
            print "Reached target"
            break
        time.sleep(2)


def go_to_position(vehicle, lat, lon):
    """Make an movement of drone according to the latitude/longitude inputted

    We think that the drone has arrived the target position when the remaining distance decreases to a so small
    value that we can ignore it. There isn't any callback function provided since the script runs synchronously,
    but it can be added easily if needed one day.

    Args:
        vehicle: Object of drone.
        lat: Latitude of target position
        lon: Longitude of target position
    """

    current_location = vehicle.location.global_relative_frame
    target_location = dronekit.LocationGlobalRelative(lat, lon, current_location.alt)
    target_distance = get_distance_metres(current_location, target_location)
    vehicle.simple_goto(target_location)

    while vehicle.mode.name == "GUIDED":  # Stop action if we are no longer in guided mode.
        remaining_distance = get_distance_metres(vehicle.location.global_frame, target_location)
        print "Distance to target: ", remaining_distance
        if remaining_distance <= target_distance * 0.01:  # Just below target, in case of undershoot.
            print "Reached target"
            break
        time.sleep(2)


def get_location_metres(original_location, dNorth, dEast):
    """
    Returns a LocationGlobal object containing the latitude/longitude `dNorth` and `dEast` metres from the
    specified `original_location`. The returned LocationGlobal has the same `alt` value
    as `original_location`.

    The function is useful when you want to move the vehicle around specifying locations relative to
    the current vehicle position.

    The algorithm is relatively accurate over small distances (10m within 1km) except close to the poles.

    For more information see:
    http://gis.stackexchange.com/questions/2951/algorithm-for-offsetting-a-latitude-longitude-by-some-amount-of-meters

    """

    earth_radius = 6378137.0  # Radius of "spherical" earth
    # Coordinate offsets in radians
    dLat = dNorth / earth_radius
    dLon = dEast / (earth_radius * math.cos(math.pi * original_location.lat / 180))

    # New position in decimal degrees
    new_lat = original_location.lat + (dLat * 180 / math.pi)
    new_lon = original_location.lon + (dLon * 180 / math.pi)
    if type(original_location) is dronekit.LocationGlobal:
        target_location = dronekit.LocationGlobal(new_lat, new_lon, original_location.alt)
    elif type(original_location) is dronekit.LocationGlobalRelative:
        target_location = dronekit.LocationGlobalRelative(new_lat, new_lon, original_location.alt)
    else:
        raise Exception("Invalid Location object passed")

    return target_location


def get_distance_metres(location1, location2):
    """
    Returns the ground distance in metres between two LocationGlobal objects.

    This method is an approximation, and will not be accurate over large distances and close to the
    earth's poles. It comes from the ArduPilot test code:
    https://github.com/diydrones/ardupilot/blob/master/Tools/autotest/common.py
    """

    d_lat = location2.lat - location1.lat
    d_lon = location2.lon - location1.lon
    return math.sqrt((d_lat*d_lat) + (d_lon*d_lon)) * 1.113195e5
