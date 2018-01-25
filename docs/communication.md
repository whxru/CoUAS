# Communication

To extend the application or create your own script on RPi, it's import to know [MAVC messages](mavc_message.md) and the process of communication between RPi and the monitor.

## Establish the connection

*   For real drone(s): The monitor will keep waiting a MAVC_REQ_CID message on UDP port 4396, once the message arrives it generates a CID for this drone and send a MAVC_CID message back in the same socket. After that the port ( 4396 + CID ) of both UDP and TCP  on monitor will be used.
*   For simulator(s): The monitor will keep waiting a MAVC_REQ_CID message on UDP port ( 4396 + index of the simulator ), notice that the index begins from 0. Once the message arrives it generates a CID for this drone and send a MAVC_CID message back in the same socket. After that the same port ( 4396 + index ) of both UDP and TCP on monitor will be used.

## Daily communication

*   Via UDP protocol :
    *   The status of drone will be reported every 0.5 second in MAVC_STAT message.
*   Via TCP protocol: 
    *   MAVC_ACTION.
    *   MAVC_SET_GEOFENCE.
    *   MAVC_ARRIVED.