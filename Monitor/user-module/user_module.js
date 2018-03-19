const menu = require('../monitor-app/module/menu');
const transform = require('../monitor/lib/transform');
/**
 * Superclass of all user modules.
 * @class UserModule
 */
class UserModule {
    /**
     * Creates and initializes an instance of UserModule.
     * @param {String} name - Name of module.
     * @memberof UserModule
     */
    constructor(name, droneCluster) {
        this.name = name;
        this.droneCluster = droneCluster;

        menu.addUserModule(this.name);
    }

    /**
     * Add a command to the menu.
     * @param {String} name - Name of the command.
     * @param {Function} func - Function of the command.
     * @memberof UserModule
     */
    addCommand(name, func) {
        menu.addUserModuleItem(this.name, name, func);
    }

    /**
     * Get messages when the application receives/sends messages from/to RPi.
     * @param {String} type - "message-in" or "message-out" or "new-drone-add"
     * @param {Function} listener - Handler of message.
     * @memberof UserModule
     */
    addMsgListener(type, listener) {
        var drone = this.droneCluster.getNotifier();
        drone.on(type, listener);
    }

    /**
     * Execute a task described by a JSON string.
     * @param {JSON} task_json - A json string which describes a task.
     * @memberof UserModule
     */
    executeTask(task_json) {
        this.droneCluster.executeTask(task_json);
    }

    /**
     * Send message to every drone in the cluster.
     * @param {Object} msg - MAVC message
     * @memberOf UserModule
     */
    broadcastMsg(msg) {
        this.droneCluster.broadcastMsg(msg);
    }

    /**
     * Send message to one single RPi.
     * @param {Number} CID - Connection ID.
     * @param {String} msg - Message to be sent.
     * @param {Function} callback - Callback function.
     * @memberof UserModule
     */
    sendMsg(CID, msg, callback) {
        var drone = this.droneCluster.getDrone(CID);
        if(!drone) {
            drone.writeDataToPi(msg, callback);
        }
    }

    /**
     * Get the status of one single drone.
     * @param {Number} CID - Connection ID
     * @returns {Object} An object which contains CID,Armd,Mode,Lat,Lon,Alt
     * @memberof UserModule
     */
    getStatus(CID) {
        var drone = this.droneCluster.getDrone(CID)
        if(!drone) {
            return drone.getStatus();
        }
        return null
    }

    /**
     * Get the number of drones in the cluster.
     * @returns {Number} Number of drones
     * @memberof UserModule
     */
    getDroneNum() {
        return this.droneCluster.getDroneNum();
    }

    /**
     * Calculate the distance between two positions.
     * @static
     * @param {Object} pos1 - Object which contains attribute 'lat' and 'lng'
     * @param {Object} pos2 - Object which contains attribute 'lat' and 'lng'
     * @param {Boolean} [mars=false] - To determine the type of lat and lng
     * @returns Distance in meters
     * @memberof UserModule
     */
    static calDistance(pos1, pos2, mars=false) {
        var marsPos1 = pos1,
            marsPos2 = pos2;
        if(!mars) {
            marsPos1 = transform.wgs2gcj(pos1.lat,pos1.lng);
            marsPos2 = transform.wgs2gcj(pos2.lat,pos2.lng);
        }
        var deltaXY = global.mapModule.calDistance(marsPos1, marsPos2);
        var deltaH = pos2.alt - pos1.alt;
        return Math.sqrt(deltaXY*deltaXY + deltaH*deltaH);
    }
}


module.exports = {
    UserModule: UserModule,
    myConsole: require('../monitor-app/module/console'),
    wd: require('../monitor-app/module/window')
}