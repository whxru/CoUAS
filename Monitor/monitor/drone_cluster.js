/**
 * @file Implement some methods to manage multiple drone connections.
 * @author whxru
 */

 const Drone = require('./drone.js');
 const dgram = require('dgram');

 // Constant value definition of communication type
 const MAVC_REQ_CID = 0            // Request the Connection ID
 const MAVC_CID = 1                // Response to the ask of Connection ID
 const MAVC_REQ_STAT = 2           // Ask for the state of drone(s)
 const MAVC_STAT = 3               // Report the state of drone
 const MAVC_ARM_AND_TAKEOFF = 4    // Ask drone to arm and takeoff
 const MAVC_GO_TO = 5              // Ask drone to fly to target specified by latitude and longitude
 const MAVC_GO_BY = 6              // Ask drone to fly to target specified by the distance in both North and East directions

 // For the use of private attributes
 const _port = Symbol('port');
 const _drones = Symbol('drones');
 // For the use of private methods
 const _sendMsgToPi = Symbol('sendMsgToPi');

 /**
  * Management of mulitple drone connections.
  * @class DroneCluster
  */
 class DroneCluster {
     /**
      * Creates an instance of DroneCluster.
      * @memberof DroneCluster
      */
     constructor() {
         this[_port] = 4396; // Port on Pi where the message will be sent to
         this[_drones] = []; // Container of drones
     }

     /**
      * Generate a unique CID and send to the Pi.
      * New an instance of Drone (send the CID as soon as the request arrived).
      * Ask the instance to start keeping listening that the message Pi will send later.
      * @summary Add one single drone into the cluster
      * @memberof DroneCluster
      */
     addDrone() {
         // Generate CID
         CID = this[_drones].length + 1;
        
         // Add drone to the container
         var drone = new Drone(CID);
         this[_drones].push(drone);

         // Start listening to the message from the Pi
         drone.listenToPi();
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
 }

 module.exports.DroneCluster = DroneCluster;