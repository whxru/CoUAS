#  -*- coding: utf-8 -*-

"""
Modules.drone_controller
~~~~~~~~~~~~~~~~~~~~~~~~

Package some drone commands as the safety of drone and correctness of tasks considered.
"""

import exceptions
from dronekit import *
from pymavlink import mavutil


def connect_vehicle(connection_string, baud=115200):
    """Connect to the vehicle through the connection string

    Args:
        connection_string: It contains address to be connected and some connection options
        baud: Baudrate

    Returns:
        An object from which you can get/set parameters and attributes, and control vehicle movement.
    """

    try:
        vehicle = connect(connection_string, wait_ready=True, baud=baud)
    except socket.error:
        print 'No server exists!'
    except exceptions.OSError as e:
        print 'No serial exists!'
    except APIException:
        print 'Timeout!'
    else:
        return vehicle


def arm_and_takeoff(vehicle, args):
    """Arms vehicle and fly to the altitude.

    Args:
        vehicle: Object of drone.
        args: Dictionary that contains action information
            * Alt: The height which the drone should arrive at after the taking off.
            * Sync: Whether report to monitor after reaching the target.
    """
    altitude = args['Alt']

    print "Arming motors"
    # Copter should arm in GUIDED mode
    vehicle.mode = VehicleMode("GUIDED")
    vehicle.armed = True

    while not vehicle.armed:
        print " Waiting for arming..."
        time.sleep(1)
    print "Armed, Taking off!"
    vehicle.simple_takeoff(altitude)  # Take off to target altitude

    # Wait until the vehicle reaches a safe height before processing the goto (otherwise the command
    #  after Vehicle.simple_takeoff will execute immediately).
    while True:
        print " Altitude: ", vehicle.location.global_relative_frame.alt
        if vehicle.location.global_relative_frame.alt >= altitude * 0.95:  # Trigger just below target alt.
            print "Reached target altitude"
            break
        time.sleep(1)


def go_by(vehicle, args):
    """Make an movement of drone according to the distance at North and East inputted

    We think that the drone has arrived the target position when the remaining distance decreases to a so small
    value that we can ignore it. There isn't any callback function provided since the script runs synchronously,
    but it can be added easily if needed one day.

    Args:
        vehicle: Object of drone.
        args: Dictionary that contains action information
            * N: Distance at North direction.
            * E: Distance at East direction.
            * Speed: Expected speed of the drone.
    """

    dNorth = args['N']
    dEast = args['E']
    current_location = vehicle.location.global_relative_frame
    print 'Go by (N: %d, E:%d)' % (dNorth, dEast)
    target_location = _get_location_metres(current_location, dNorth, dEast)
    fly_to(vehicle, target_location)


def go_to(vehicle, args):
    """Make an movement of drone according to the latitude/longitude inputted

    We think that the drone has arrived the target position when the remaining distance decreases to a so small
    value that we can ignore it. There isn't any callback function provided since the script runs synchronously,
    but it can be added easily if needed one day.

    Args:
        vehicle: Object of drone.
        args: Dictionary that contains action information
            * Lat: Latitude of target position.
            * Lon: Longitude of target position.
            * Speed: Expected speed of the drone.
    """

    lat = args['Lat']
    lon = args['Lon']
    alt = args['Alt']
    fly_to(vehicle, LocationGlobalRelative(lat, lon, alt))


def fly_to(vehicle, target):
    """Implementation of function go_by and go_to"""

    init_location = vehicle.location.global_relative_frame
    wait_time = 0
    resend_cmd = False

    vehicle.simple_goto(target)

    while vehicle.mode.name == "GUIDED":  # Stop action if we are no longer in guided mode.
        time.sleep(1)
        wait_time += 1
        current_location = vehicle.location.global_relative_frame

        # Resend movement cmd if the drone nearly keeps staying in the original position
        moved_distance = _get_distance_metres(init_location, current_location)
        # if wait_time > 4 and moved_distance < vehicle.groundspeed * wait_time * 0.3:
        if wait_time > 4 and moved_distance < 2:
            print "Redo fly_to"
            resend_cmd = True
            break

        # To judge whether the drone has arrived the target position
        remaining_distance = _get_distance_metres(current_location, target)
        print "Distance to target: ", remaining_distance
        if remaining_distance <= 1:  # Just below target, in case of undershoot.
            print "Reached target"
            break

    if resend_cmd:
        fly_to(vehicle, target)


def land(vehicle, args):
    """Ask the drone to land at a specific location.

    If the latitude equals zero, then the drone will land at the current location.

    Args:
        vehicle: Object of the drone.
        args: Dictionary of parameters.
            Lat: Latitude.
            Lon: Longitude.
    """
    # Get latitude and longitude
    lat = args['Lat']
    lon = args['Lon']
    vehicle.mode = VehicleMode("LAND")


def return_to_launch(vehicle):
    """Ask the drone to return to launch"""
    vehicle.mode = VehicleMode('RTL')


def set_speed(vehicle, speed):
    """Set speed of the drone"""
    vehicle.groundspeed = speed


def _get_location_metres(original_location, dNorth, dEast):
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
    if type(original_location) is LocationGlobal:
        target_location = LocationGlobal(new_lat, new_lon, original_location.alt)
    elif type(original_location) is LocationGlobalRelative:
        target_location = LocationGlobalRelative(new_lat, new_lon, original_location.alt)
    else:
        raise Exception("Invalid Location object passed")

    return target_location


def _get_distance_metres(location1, location2):
    """
    Returns the ground distance in metres between two LocationGlobal objects.

    This method is an approximation, and will not be accurate over large distances and close to the
    earth's poles. It comes from the ArduPilot test code:
    https://github.com/diydrones/ardupilot/blob/master/Tools/autotest/common.py
    """

    d_lat = location2.lat - location1.lat
    d_lon = location2.lon - location1.lon
    return math.sqrt((d_lat*d_lat) + (d_lon*d_lon)) * 1.113195e5
