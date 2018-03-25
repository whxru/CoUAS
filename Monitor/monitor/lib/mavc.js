module.exports.MAVC = {
    // Definitions of communication type
    "MAVC_REQ_CID": 0,            // Request the Connection ID
    "MAVC_CID": 1,                // Response to the ask of Connection ID
    "MAVC_STAT": 2,               // Report the state of drone
    "MAVC_SET_GEOFENCE": 3,       // Set the geofence of drone
    "MAVC_ACTION": 4,             // Action to be performed
    "MAVC_ARRIVED": 5,            // Tell the monitor that the drone has arrived at the target
    "MAVC_DONE": 6,               // Close the connection between RPi and monitor 
    "MAVC_DELAY_TEST": 101,       // To test the communication delay
    "MAVC_DELAY_RESPONSE": 102,   // Response to MAVC_DELAY_TEST
    // Definitions of action type
    "ACTION_ARM_AND_TAKEOFF" : 0, // Ask drone to arm and takeoff
    "ACTION_GO_TO" : 1,           // Ask drone to fly to target specified by latitude and longitude
    "ACTION_GO_BY" : 2,           // Ask drone to fly to target specified by the distance in both North and East directions
    "ACTION_LAND" : 3             // Ask drone to land at current or a specific position
}