/**
 * @file Manage one single drone state and its connection with Pi
 * @author whxru
 */

const dgram = require('dgram');
const publicIp = require('public-ip')

// For the use of private attributes
const _taskDone = Symbol('taskDone');
const _host = Symbol('host');
const _state = Symbol('state');
const _publicIp = Symbol('_publicIp');
// For the use of private methods
const _establishConnection = Symbol('establishConnection');
const _updateState = Symbol('updateState');

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
            'Armed': False,
            'Mode': '',
            'Lat': 361,
            'Lon': 361,
            'Alt': 0
        };
        publicIp.v4().then(ip => {
            this[_publicIp] = ip;
        });
        this[_establishConnection]();
    }

    /** Bind port 4396 to handle the request of CID. */
    [_establishConnection]() {
        // Wait for the request of CID
        console.log('Waiting the request of CID...');
        const s = dgram.createSocket('udp4');
        s.bind(4396, this[_publicIp]);
        while(true) {
            var msg_obj, host, port;
            // Receive UDP diagram on port 4396
            s.on('message', (msg_buf, rinfo) => {
                // Whether the message is a json string or not
                try {
                    msg_obj = JSON.parse(msg_buf.toString('utf8'));
                } catch (error) {
                    continue; // SyntaxError
                }
                // Whether the message is a MAVC message that request CID or not
                try {
                    if (msg_obj[0]['Header'] === 'MAVCluster_Drone' && msg_obj[0]['Type'] === MAVC_REQ_CID) {
                        host = rinfo.address;
                        port = rinfo.port;
                        this[_host] = host;
                        console.log(`The request of CIF from address:${this[_host]} has been received!`);
                        break;
                    }
                } catch (error) {
                    continue; // TypeError
                }
            });
        }

        // Send the CID back
        msg = [
            {
                'Header': 'MAVCluster_Monitor',
                'Type': MAVC_CID
            },
            {
                'CID': self.__state['CID']
            }
        ];
        s.send(JSON.stringify(msg), port, host, (err) => {
            s.close();
        });
    }

    /**
     * Deep copy of drone state.
     * @param {any} state_obj - Dictionary of drone's state that monitor received from Raspberry Pi 3
     * @memberof Drone
     */
    [_updateState](state_obj) {
        var keys = Object.keys(state_obj);
        keys.forEach((attr) => {
            this[_state][attr] = state_obj[attr];
        });
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
                continue;
            }
            // Whether the message is a json string or not
            try {
                msg_obj = JSON.parse(msg_buf.toString('utf8'));
            } catch (error) {
                continue; // SyntaxError
            }
            // Whether the message is a MAVC message from Pi
            try {
                if (msg_obj[0]['Header'] === 'MAVCluster_Drone'){
                    // Message contains the state of drone
                    if(msg_obj[0]['Type'] === MAVC_STAT) {
                        this[_updateState](msg_obj)
                        console.log(this[_updateState]);
                        break;
                    }
                }
            } catch (error) {
                continue; // TypeError
            }
        });
}
}

module.exports.Drone = Drone;