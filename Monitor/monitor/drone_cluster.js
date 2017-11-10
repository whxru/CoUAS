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
const MAVC_ACTION = 4;             // Action to be performed
const MAVC_ARRIVED = 5;            // Tell the monitor that the drone has arrived at the target


// For the use of private attributes
const _port = Symbol('port');
const _drones = Symbol('drones');
const _publicIp = Symbol('publicIp');
const _broadcastAddr = Symbol('broadcastAddr');
// For the use of private methods
const _sendMsgToPi = Symbol('sendMsgToPi');
const _assignTask = Symbol('assignTask');

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
     * Execute actions in a task
     * @param {String} task_json - JSON string contains all of the actions 
     * @memberof DroneCluster
     */
    executeTask(task_json) {
        if(!DroneCluster.isTaskString(task_json)) {
            return;
        }
        // The json string describes a MAVC task
        var actions = JSON.parse(task_json);
        var task_obj = [
            {
                "Header": "MAVCluster_Monitor",
                "Type": MAVC_ACTION
            }
        ];
        console.log(actions);
        actions.forEach((action) => {
            task_obj.push(action);
        });
        this[_assignTask](task_obj);
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
     * Send task messages to every one of the Pi
     * @param {Object} task - MAVC message 
     * @memberof DroneCluster
     */
    [_assignTask](task) {
        const s = dgram.createSocket('udp4');
        s.bind(() => {
            s.setBroadcast(true);
            var msg = JSON.stringify(task);
            s.send(msg, 0, msg.length, 4396, this[_broadcastAddr], (error) => {
                s.close()
            });
        });
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