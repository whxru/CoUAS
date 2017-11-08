/**
 * @file Manage one single drone state and its connection with Pi
 * @author whxru
 */

const dgram = require('dgram');
const publicIp = require('public-ip');
const Map = require('../monitor-app/monitor.js');

// Constant value definition of communication type
const MAVC_REQ_CID = 0            // Request the Connection ID
const MAVC_CID = 1                // Response to the ask of Connection ID
const MAVC_REQ_STAT = 2           // Ask for the state of drone(s)
const MAVC_STAT = 3               // Report the state of drone
const MAVC_ARM_AND_TAKEOFF = 4    // Ask drone to arm and takeoff
const MAVC_GO_TO = 5              // Ask drone to fly to target specified by latitude and longitude
const MAVC_GO_BY = 6              // Ask drone to fly to target specified by the distance in both North and East directions
const MAVC_ARRIVED = 7            // Tell the monitor that the drone has arrived at the target

// For the use of private attributes
const _taskDone = Symbol('taskDone');
const _host = Symbol('host');
const _state = Symbol('state');
const _home = Symbol('home');
const _marker = Symbol('marker');
const _publicIp = Symbol('publicIp');
// For the use of private methods
const _establishConnection = Symbol('establishConnection');
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
     * @param {number} CID - Identifier of one single connection
     */
    constructor(CID) {
        this[_taskDone] = false;    // Whether the task has been done
        this[_host] = '';           // Host name of the Pi connected
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
        this[_publicIp] = '172.20.10.5';
        this[_establishConnection]();
    }

    /**
     * Bind port 4396 to handle the request of CID.
     * @memberof Drone
     */
    [_establishConnection]() {
        const s = dgram.createSocket('udp4');
        s.bind(4396, this[_publicIp]);
        var msg_obj, host, port;

        // Wait for the request of CID
        s.on('listening', () => {
            console.log('Waiting the request of CID...');
        });

        // Receive UDP diagram on port 4396
        s.on('message', (msg_buf, rinfo) => {
            console.log(msg_buf.toString('utf8'));
            // Whether the message is a json string or not
            try {
                msg_obj = JSON.parse(msg_buf.toString('utf8'));
            } catch (error) {
                console.log(error.message);
                return; // SyntaxError
            }
            // Whether the message is a MAVC message or not
            try {
                // MAVC message that request CID
                if (msg_obj[0]['Header'] === 'MAVCluster_Drone' && msg_obj[0]['Type'] === MAVC_REQ_CID) {
                    console.log(`The request of CID from address:${rinfo.address} has been received!`);
                    // Extract information 
                    host = rinfo.address;
                    port = rinfo.port;
                    this[_host] = host;
                    this[_home]['Lat'] = msg_obj[1]['Lat'];
                    this[_home]['Lon'] = msg_obj[1]['Lon'];
                    // Preload map resources
                    this[_marker] = Map.preloadMap(this[_state].CID, this[_home]);
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
                        console.log(`Message contains CID has been sent out!`);
                        s.close();
                    });
                    // Start listeing to Pi
                    this.listenToPi()
                }
            } catch (error) {
                console.log(error.message);
                return; // TypeError
            }
        });
    }

    /**
     * Deep copy of drone state and update the marker on map.
     * @param {object} state_obj - Dictionary of drone's state that monitor received from Raspberry Pi 3
     * @memberof Drone
     */
    [_updateState](state_obj) {
        // console.log(state_obj.Lat + '/' + state_obj.Lon);
        // Update data
        var keys = Object.keys(state_obj);
        keys.forEach((attr) => {
            this[_state][attr] = state_obj[attr];
        });
        // Update marker
        Map.updateState(this[_marker], state_obj);
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
     * @returns {number} The CID value.
     * @memberof Drone
     */
    getCID() {
        return this[_state]['CID'];
    }

    /**
     * Keep listening the message sent from the Pi
     * By default we bind port 4396+CID on Monitor to handle the message from Pi.
     * @memberof Drone
     */
    listenToPi() {
        const s = dgram.createSocket('udp4');
        var host = this[_publicIp];
        var port = 4396 + this.getCID();
        s.bind(port, host);
        
        s.on('listening', ()=> {
            console.log(`Start listening to the Pi on ${host}:${port}`);
        });

        s.on('message', (msg_buf, rinfo) => {
            if(this[_taskDone]) {
                s.close();
                return;
            }
            var addr, msg_obj;
            // Whether this message is sent from the Pi or not
            addr = rinfo.address;
            if(!addr === this[_host]){ 
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
                if (msg_obj[0]['Header'] === 'MAVCluster_Drone'){
                    // Message contains the state of drone
                    if(msg_obj[0]['Type'] === MAVC_STAT) {
                        // Update state
                        this[_updateState](msg_obj[1]);
                        return;
                    }
                }
            } catch (error) {
                return; // TypeError
            }
        });
}
}

module.exports.Drone = Drone;