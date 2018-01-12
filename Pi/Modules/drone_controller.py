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
    except:
        print 'Some other error while connecting to the drone!'
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

    print "Basic pre-arm checks"
    # Don't let the user try to arm until autopilot is ready
    while not vehicle.is_armable:
        print " Waiting for vehicle to initialise..."
        time.sleep(1)

    print "Arming motors"
    # Copter should arm in GUIDED mode
    vehicle.mode = VehicleMode("GUIDED")
    vehicle.armed = True

    while not vehicle.armed:
        print " Waiting for arming..."
        time.sleep(1)

    print "Taking off!"
    vehicle.simple_takeoff(altitude)  # Take off to target altitude

    # Wait until the vehicle reaches a safe height before processing the goto (otherwise the command
    #  after Vehicle.simple_takeoff will execute immediately).
    while True:
        print " Altitude: ", vehicle.location.global_relative_frame.alt
        if vehicle.location.global_relative_frame.alt >= altitude * 0.95:  # Trigger just below target alt.
            print "Reached target altitude"
            break
        time.sleep(1)

    cmd = Command(0, 0, 0, mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT, mavutil.mavlink.MAV_CMD_NAV_TAKEOFF, 0, 0,
                  0, 0, 0, 0, 0, 0, altitude)
    vehicle.commands.add(cmd)


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
            * O: The position that the target is relative to.
    Returns:
        The target position.
    """

    dNorth = args['N']
    dEast = args['E']
    current_location = args['O']
    print 'Go by (N: %d, E:%d)' % (dNorth, dEast)
    target_location = _get_location_metres(current_location, dNorth, dEast)

    cmd = Command(0, 0, 0, mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT, mavutil.mavlink.MAV_CMD_NAV_WAYPOINT, 0, 0,
                  0, 0, 0, 0, target_location.lat, target_location.lon, target_location.alt)
    vehicle.commands.add(cmd)
    return target_location


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
            * Time: Expected time of the task (second).
    Returns:
        The target position.
    """

    lat = args['Lat']
    lon = args['Lon']
    alt = args['Alt']

    cmd = Command(0, 0, 0, mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT, mavutil.mavlink.MAV_CMD_NAV_WAYPOINT, 0, 0,
                  0, 0, 0, 0, lat, lon, 0)
    vehicle.commands.add(cmd)
    return LocationGlobalRelative(lat, lon, alt)


def land(vehicle, args):
    """Ask the drone to land at a specific location.

    If the latitude and longitude both equal zero, then the drone will land at the current location.

    Args:
        vehicle: Object of the drone.
        args: Dictionary of parameters.
            Lat: Latitude.
            Lon: Longitude.
    """
    # Get latitude and longitude
    lat = args['Lat']
    lon = args['Lon']

    cmd = Command(0, 0, 0, mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT, mavutil.mavlink.MAV_CMD_NAV_LAND, 0, 0,
                  0, 0, 0, 0, lat, lon, 0)
    vehicle.commands.add(cmd)


def wait_next_mission(vehicle):
    """Wait for sync"""
    vehicle.commands.add(
        Command(0, 0, 0, mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT, mavutil.mavlink.MAV_CMD_NAV_LOITER_UNLIM, 0,
                0, 0, 0, 0, 0, 0, 0, 0)
    )


def clear_mission(vehicle):
    """Clear commands in current mission"""
    cmds = vehicle.commands
    cmds.clear()


def start_mission(vehicle):
    """Restart a new mission"""
    cmds = vehicle.commands
    cmds.upload()
    print "Commands uploaded!"
    vehicle.mode = VehicleMode('GUIDED')
    while not vehicle.mode == 'GUIDED':
        pass
    vehicle.mode = VehicleMode('AUTO')
    print "Start mission!"


def current_cmd_index(vehicle):
    return vehicle.commands.next


def return_to_launch(vehicle):
    """Ask the drone to return to launch"""
    vehicle.mode = VehicleMode('RTL')


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
