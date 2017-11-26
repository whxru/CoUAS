/**
 * @file Implement some methods to manage multiple drone connections.
 * @author whxru
 */

const { Drone } = require('./drone.js');
const dgram = require('dgram');

// Constant value definitions of communication type
const MAVC_REQ_CID = 0;            // Request the Connection ID
const MAVC_CID = 1;                // Response to the ask of Connection ID
const MAVC_REQ_STAT = 2;           // Ask for the state of drone(s)
const MAVC_STAT = 3;               // Report the state of drone
const MAVC_SET_GEOFENCE = 4;       // Set the geofence of drone
const MAVC_ACTION = 5;             // Action to be performed
const MAVC_ACTION_SEC = 6;         // Part of actions in a MAVC_ACTION message
const MAVC_ARRIVED = 7;            // Tell the monitor that the drone has arrived at the target
// Constant value definitions of action type
const ACTION_ARM_AND_TAKEOFF = 0;  // Ask drone to arm and takeoff
const ACTION_GO_TO = 1;            // Ask drone to fly to target specified by latitude and longitude
const ACTION_GO_BY = 2;            // Ask drone to fly to target specified by the distance in both North and East directions
const ACTION_WAIT = 3;             // Ask drone to do nothing but wait a specific time
const ACTION_LAND = 4;             // Ask drone to land at current or a specific position

// For the use of private attributes
const _port = Symbol('port');
const _drones = Symbol('drones');
const _publicIp = Symbol('publicIp');
const _broadcastAddr = Symbol('broadcastAddr');
// For the use of private methods
const _sendMsgToPi = Symbol('sendMsgToPi');
const _broadcastMsg = Symbol('broadcastMsg');
const _sendSubtasks = Symbol('sendSubtasks');

/**
 * Management of mulitple drone connections.
 * @class DroneCluster
 */
class DroneCluster {
    /**
     * Creates an instance of DroneCluster.
     * @param {String} interfaceName - Name of network interface will be used
     * @memberof DroneCluster
     */
    constructor(interfaceName) {
        this[_port] = 4396; // Port on Pi where the message will be sent to
        this[_drones] = []; // Container of drones

        // Calculate broadcast address
        var iface = require('os').networkInterfaces()[interfaceName];
        var ipv4Addr = iface[1]['address'];
        var netmask = iface[1]['netmask'];
        this[_publicIp] = ipv4Addr;
        this[_broadcastAddr] = DroneCluster.getBroadcastAddr(ipv4Addr, netmask);
    }

    /**
     * Generate a unique CID and send to the Pi.
     * New an instance of Drone (send the CID as soon as the request arrived).
     * @summary Add one single drone into the cluster
     * @memberof DroneCluster
     */
    addDrone() {
        // Generate CID
        var CID = this[_drones].length + 1;

        // Add drone to the container
        var drone = new Drone(CID, this[_publicIp]);
        this[_drones].push(drone);
    }

    /**
     * Decompose current task into serveral subtasks and send them.
     * @param {String} task_json - JSON string contains all of the actions 
     * @memberof DroneCluster
     */
    executeTask(task_json) {
        if (!DroneCluster.isTaskString(task_json)) {
            return;
        }
        // Get actions in the task
        var actions = JSON.parse(task_json);

        // Decompose current task into several subtasks
        var subtasks = [];
        var indexes = []; // Which subtask the drone currently in 
        this[_drones].forEach(() => { indexes.push(0) });
        // There is at least one subtask
        subtasks.push([
            {
                "Header": "MAVCluster_Monitor",
                "Type": MAVC_ACTION
            }
        ]);
        while (actions.length > 0) {
            // Push action into current subtask
            var action = actions[0];
            var index = indexes[action.CID - 1];
            subtasks[index].push(action);
            // Shift action from the origin task away
            actions.shift();
            // Update index if needed
            if (action['Sync'] === true) {
                index = ++indexes[action.CID - 1];
                // Create next subtask if needed
                if (index >= subtasks.length) {
                    subtasks.push([
                        {
                            "Header": "MAVCluster_Monitor",
                            "Type": MAVC_ACTION
                        }
                    ]);
                }
            }
        }
        // An empty subtask may be created
        if (subtasks[subtasks.length - 1].length === 1) {
            subtasks.pop();
        }

        // Send subtasks
        this[_sendSubtasks](subtasks);
    }

    /**
     * Set the geofence of cluster
     * @param {Number} rad - Radius of the circle 
     * @param {Number} lat - Latitude of the center
     * @param {Number} lon - Longitude of the center
     * @memberof DroneCluster
     */
    setGeofence(rad, lat, lon) {
        var msg = [
            {
                "Header": "MAVCluster_Monitor",
                "Type": MAVC_SET_GEOFENCE
            },
            {
                "Radius": rad,
                "Lat": lat,
                "Lon": lon
            }
        ];
        this[_broadcastMsg](msg);
    }

    /**
     * Send message to the Pi specified by the host
     * @param {string} host - Address of Pi
     * @param {object} msg - MAVC message
     * @memberof DroneCluster
     */
    [_sendMsgToPi](host, msg) {
        const s = dgram.createSocket('udp4');
        msg = JSON.stringify(msg);
        s.send(msg, 4396, host, (error) => {
            s.close();
        });
    }

    /**
     * Send subtasks one by one.
     * @param {Object} subtasks - MAVC_ACTION message of subtasks
     * @memberof DroneCluster
     */
    [_sendSubtasks](subtasks) {
        // Send first subtask
        this[_broadcastMsg](subtasks[0]);
        // Wait for all actions having been performed
        var index = 0;                          // Which subtask the cluster currently in.
        var counter = 0;                        // Number of drones which has been ready for next subtask.
        var droneNum = this[_drones].length;    // Total number of drones.
        let cls_subtasks = subtasks;            // Used in closure.
        this[_drones].forEach((drone) => {
            var notifier = drone.getEventNotifier();
            // One of the drones has finished performing actions in current subtask
            notifier.on('arrive', (notifier) => {
                if (++counter === droneNum) {
                    console.log("Go to next subtask");
                    // Empty the counter
                    counter = 0;
                    // Execute next subtask
                    if (++index < cls_subtasks.length) {
                        this[_broadcastMsg](cls_subtasks[index]);
                    }
                }
            });
        });
    }

    /**
     * Broadcast message among the LAN
     * @param {Object} msg - MAVC message
     * @memberof DroneCluster
     */
    [_broadcastMsg](msg) {
        // Maximum number of actions in MAVC_ACTION_SEC message
        const MAX_ACTIONS_NUM = 8;
        // Socket
        const s = dgram.createSocket('udp4');
        s.bind(() => {
            s.setBroadcast(true);
        });

        // Normal length
        if (msg.length <= MAX_ACTIONS_NUM + 1) {
            var msg_json = JSON.stringify(msg);
            s.send(msg_json, 0, msg_json.length, 4396, this[_broadcastAddr], (error) => {
                s.close()
            });
            // Length of MAVC_ACTION exceeds the limit
        } else if (msg[0]['Type'] === MAVC_ACTION) {
            // Remove the original header
            msg.shift();
            var actions = msg;

            // Decompose long subtask into short sections
            var index = 0; // Index the section in subtask
            var total_sec = Math.ceil(actions.length / MAX_ACTIONS_NUM);
            var sections = [[{
                "Header": "MAVCluster_Monitor",
                "Type": MAVC_ACTION_SEC,
                "Subtask": total_sec,
                "Index": index
            }]];
            actions.forEach((action, i, actions) => {
                var section = sections[index];
                if (section.length === MAX_ACTIONS_NUM + 1) {
                    sections.push([{
                        "Header": "MAVCluster_Monitor",
                        "Type": MAVC_ACTION_SEC,
                        "Subtask": total_sec,
                        "Index": ++index
                    }]);
                    sections[index].push(action);
                } else {
                    section.push(action);
                    if(i === actions.length - 1) {
                        return;
                    }
                }
            });

            // Send the first section
            const {EventEmitter} = require('events');
            let emt = new EventEmitter();
            msg = JSON.stringify(sections.shift());
            s.send(msg, 0, msg.length, 4396, this[_broadcastAddr], (err) => {
                emt.emit('sent-out', emt);                        
            });
            // Send sections one by one
            emt.on('sent-out', (emitter) => {
                if(sections.length > 0) {
                    msg = JSON.stringify(sections.shift());
                    s.send(msg, 0, msg.length, 4396, this[_broadcastAddr], (err) => {
                        emitter.emit('sent-out', emitter);                        
                    });
                }
            });
        }
    }

    /**
     * Caculate the address of broadcast
     * @static
     * @param {String} ipv4Addr - IPv4 address
     * @param {String} netmask - Netmask
     * @returns {string} Broadcast address
     * @memberof DroneCluster
     */
    static getBroadcastAddr(ipv4Addr, netmask) {
        var addrParts = ipv4Addr.split('.');
        var maskParts = netmask.split('.');
        var broadcastAddr = '';
        for (let n = 0; n < 4; n++) {
            var partAddr = '';

            var addr = ('00000000' + parseInt(addrParts[n]).toString(2)).substr(-8);
            var mask = ('00000000' + parseInt(maskParts[n]).toString(2)).substr(-8);
            for (let m = 0; m < 8; m++) {
                if (mask[m] === '0') {
                    partAddr += '1';
                } else {
                    partAddr += addr[m];
                }
            }

            broadcastAddr += parseInt(partAddr, 2).toString();
            if (n < 3) {
                broadcastAddr += '.';
            }
        }

        return broadcastAddr;
    }

    /**
     * To judge whether the string descrips a MAVC task
     * @static
     * @param {String} str - String to be judged
     * @returns The result of judgment
     * @memberof DroneCluster
     * @todo Implementation
     */
    static isTaskString(str) {
        return true;
    }
}

module.exports.DroneCluster = DroneCluster;