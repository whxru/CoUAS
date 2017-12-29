/**
 * @file Manage one single drone state and its connection with Pi
 * @author whxru
 */

const dgram = require('dgram');
const net = require('net');
const Map = require('../monitor-app/main/monitor.js');
const os = require('os');
const events = require('events');
const wgs2mars = require('wgs2mars');
// Constant value definitions of communication type
const MAVC_REQ_CID = 0;            // Request the Connection ID
const MAVC_CID = 1;                // Response to the ask of Connection ID
const MAVC_STAT = 2;               // Report the state of drone
const MAVC_SET_GEOFENCE = 3;       // Set the geofence of drone
const MAVC_ACTION = 4;             // Action to be performed
const MAVC_ARRIVED = 5;            // Tell the monitor that the drone has arrived at the target
// Constant value definitions of action type
const ACTION_ARM_AND_TAKEOFF = 0;  // Ask drone to arm and takeoff
const ACTION_GO_TO = 1;            // Ask drone to fly to target specified by latitude and longitude
const ACTION_GO_BY = 2;            // Ask drone to fly to target specified by the distance in both North and East directions
const ACTION_LAND = 3;             // Ask drone to land at current or a specific position

// For the use of private attributes
const _drone = Symbol('drone');
const _taskDone = Symbol('taskDone');
const _host = Symbol('host');
const _state = Symbol('state');
const _home = Symbol('home');
const _marker = Symbol('marker');
const _trace = Symbol('trace');
const _traceArr = Symbol('traceArr');
const _publicIp = Symbol('publicIp');
const _server = Symbol('server');
const _tcpSock = Symbol('tcpSock');
const _udpSock = Symbol('udpSock');
const _distance = Symbol('distance');
const _sitl = Symbol('sitl');
// For the use of private methods
const _establishConnection = Symbol('establishConnection');
const _listenToPi = Symbol('listenToPi');
const _updateState = Symbol('updateState');
const _preloadMap = Symbol('preloadMap');

/**
 * Manage state of one single drone.
 * Maintain the connection between monitor and one single drone(actually the Raspberry Pi 3)
 * @class Drone
 */
class Drone {
    /**
     * Initialize attributes and establish the connection.
     * @param {Number} CID - Identifier of one single connection
     * @param {String} ipAddr - IPv4 address
     * @param {Boolean} sitl - To determine the type of drone
     */
    constructor(CID, ipAddr, sitl) {
        this[_drone] = new events.EventEmitter();  // Drone's event notifier
        this[_taskDone] = false;    // Whether the task has been done
        this[_host] = '';           // Host name of the Pi connected
        this[_sitl] = sitl;
        this[_state] = {            // Information of state the drone connected
            'CID': CID,
            'Armed': false,
            'Mode': '',
            'Lat': 361,
            'Lon': 361,
            'Alt': 0
        };
        this[_home] = {             // Location of home
            'Lat': 361,
            'Lon': 361
        };
        this[_marker] = null;       // Marker on map
        this[_trace] = null;        // Trace on map
        this[_traceArr] = [];       // Points of trace

        this[_publicIp] = ipAddr;
        this[_server] = null;
        this[_tcpSock] = null;
        this[_udpSock] = null;

        this[_distance] = 0;
        this[_establishConnection]();
    }

    /**
     * Bind port to handle the request of CID.
     * @memberof Drone
     */
    [_establishConnection]() {
        var index = this.getCID();
        const s = dgram.createSocket('udp4');
        s.bind(4396 + (this[_sitl] ? index : 0), this[_publicIp], () => {
            this[_udpSock] = s;
        });
        var msg_obj, host, port;

        // Wait for the request of CID
        s.on('listening', () => {
            console.log('Waiting the request of CID...');
        });

        // Receive UDP diagram on port 4396
        s.on('message', (msg_buf, rinfo) => {
            // Whether the message is a json string or not
            try {
                msg_obj = JSON.parse(msg_buf.toString('utf8'));
            } catch (error) {
                return; // SyntaxError
            }
            // Whether the message is a MAVC message or not
            try {
                // MAVC message that request CID
                if (msg_obj[0]['Header'] === 'MAVCluster_Drone' && msg_obj[0]['Type'] === MAVC_REQ_CID) {
                    console.log(`The request of CID from address:${rinfo.address}:${rinfo.port} has been received!`);
                    // Extract information 
                    host = rinfo.address;
                    port = rinfo.port;
                    this[_host] = host;
                    this[_home]['Lat'] = msg_obj[1]['Lat'];
                    this[_home]['Lon'] = msg_obj[1]['Lon'];
                    // Preload map resources
                    var { marker, trace } = Map.preloadMap(this[_state].CID, this[_home]);
                    this[_marker] = marker;
                    this[_trace] = trace;
                    // Send CID back
                    console.log(this[_state]);
                    var msg = [
                        {
                            'Header': 'MAVCluster_Monitor',
                            'Type': MAVC_CID
                        },
                        {
                            'CID': this[_state]['CID']
                        }
                    ];
                    s.send(JSON.stringify(msg), port, host, (err) => {
                        // Start listeing to Pi
                        if(this[_sitl]) {
                            this[_listenToPi]()
                        } else {
                            s.close(() => {
                                this[_listenToPi]()
                            })
                        }
                    });
                }
            } catch (error) {
                console.log(error.message);
                return; // TypeError
            }
        });
    }

    /**
     * Keep listening the message sent from the Pi
     * By default we bind port 4396+CID on Monitor to handle the message from Pi.
     * @memberof Drone
     */
    [_listenToPi]() {
        var host = this[_publicIp];
        var port = 4396 + this.getCID();

        var s;
        // UDP diagram
        if(this[_sitl]) {
            s = this[_udpSock];
            s.removeListener('message', s.listeners('message')[s.listenerCount('message')-1]);
        } else {
            s = dgram.createSocket('udp4')
            s.bind(port, host);
        }
        s.on('message', (msg_buf, rinfo) => {
            if (this[_taskDone]) {
                s.close();
                return;
            }
            var addr, msg_obj;
            // Whether this message is sent from the Pi or not
            addr = rinfo.address;
            if (!addr === this[_host]) {
                return;
            }
            // Whether the message is a json string or not
            try {
                msg_obj = JSON.parse(msg_buf.toString('utf8'));
            } catch (error) {
                return; // SyntaxError
            }
            // Whether the message is a MAVC message from Pi
            try {
                if (msg_obj[0]['Header'] === 'MAVCluster_Drone') {
                    var Type = msg_obj[0]['Type'];
                    // Message contains the state of drone
                    if (Type === MAVC_STAT) {
                        // Update state
                        this[_updateState](msg_obj[1]);
                        return;
                    }
                }
            } catch (error) {
                return; // TypeError
            }
        });

        // TCP data
        this[_server] = net.createServer((sock) => {
            this[_tcpSock] = sock;
            console.log(`Establish connection with Pi-${this.getCID()} from ${sock.remoteAddress}:${sock.remotePort}(TCP)`);
            sock.on('data', (msg_buf) => {
                if (this[_taskDone]) {
                    this[_server].close(() => {
                        console.log(`Close the connection with Pi-${this.getCID()}`);
                    });
                    return;
                }
                var addr, msg_obj;
                // Whether this message is sent from the Pi or not
                addr = sock.remoteAddress;
                if (!addr === this[_host]) {
                    return;
                }
                // Whether the message is a json string or not
                try {
                    msg_obj = JSON.parse(msg_buf.toString('utf8'));
                } catch (error) {
                    return; // SyntaxError
                }
                // Whether the message is a MAVC message from Pi
                try {
                    if (msg_obj[0]['Header'] === 'MAVCluster_Drone') {
                        var Type = msg_obj[0]['Type'];
                        if (Type === MAVC_ARRIVED) {
                            console.log(`Drone - CID: ${msg_obj[1]['CID']} arrive at step:${msg_obj[1]['Step']}!`)
                            if (msg_obj[1]['CID'] === this.getCID()) {
                                // Notify that the drone has arrived
                                this[_drone].emit('arrive', this[_drone]);
                            } else {
                                // to-do: handler for wrone receiver
                            }
                        }
                    }
                } catch (error) {
                    return; // TypeError
                }
            });
        })
        this[_server].listen(port, host);
    }
    /**
     * Deep copy of drone state and update the marker on map.
     * @param {Object} state_obj - Dictionary of drone's state that monitor received from Raspberry Pi 3
     * @memberof Drone
     */
    [_updateState](state_obj) {
        // Update data
        var keys = Object.keys(state_obj);
        keys.forEach((attr) => {
            this[_state][attr] = state_obj[attr];
        });
        // Update marker
        var pos_mars = wgs2mars(state_obj.Lon, state_obj.Lat);
        this[_marker].setPosition([pos_mars.lng, pos_mars.lat]);
        // Update trace and distance
        if (state_obj['Armed']) {
            this[_traceArr].push([pos_mars.lng, pos_mars.lat]);
            this[_trace].setPath(this[_traceArr]);

            var len = this[_traceArr].length;
            if (len > 1) {
                var previousState = this[_traceArr][len - 2];
                var previousLat, previousLon;
                if (len == 2) {
                    previousLat = previousState.lat;
                    previousLon = previousState.lng;
                } else {
                    previousLat = previousState[1];
                    previousLon = previousState[0];
                }

                var curPos = new global.Map.LngLat(pos_mars.lng, pos_mars.lat);
                var prePos = new global.Map.LngLat(previousLon, previousLat);
                this[_distance] += curPos.distance(prePos);
            }
        }
    }

    /**
     * Get the host of Pi connected.
     * @returns - IP address of Pi connected
     * @memberof Drone
     */
    getPiHost() {
        return this[_host];
    }

    /**
     * Get the CID of drone.
     * @returns {Number} The CID value.
     * @memberof Drone
     */
    getCID() {
        return this[_state]['CID'];
    }

    /**
     * Get the distance.
     * @returns {Float} The distance.
     * @memberof Drone
     */
    getDistance() {
        return this[_distance];
    }

    /**
     * Get event notifier of the drone
     * @returns Event notifier of the drone
     * @memberof Drone
     */
    getEventNotifier() {
        return this[_drone];
    }

    /**
     * Clear trace generated by previous task.
     * @memberof Drone
     */
    clearTrace() {
        this[_distance] = 0;
        if (this[_traceArr].length > 1) {
            this[_traceArr] = [];
            this[_trace].setPath([]);
        }
    }

    /**
     * Send data to the Pi connected.
     * @param {String} data - Data to be sent 
     * @param {Function} callback - Callback function
     * @memberof Drone
     */
    writeDataToPi(data, callback) {
        this[_tcpSock].write(data, callback);
    }
}

module.exports.Drone = Drone;