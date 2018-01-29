const menu = require('../monitor-app/module/menu');

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
     * Add a command to the module.
     * @param {String} name - Name of the command.
     * @param {Function} func - Function of the command.
     * @memberof UserModule
     */
    addCommand(name, func) {
        menu.addUserModuleItem(this.name, name, func);
    }

    /**
     * Get messages when the application receives/sends messages from/to RPi.
     * @param {String} type - "message-in" or "message-out"
     * @param {Function} listener - Handler of message.
     * @memberof UserModule
     */
    addMsgListener(type, listener) {
        var drone = this.droneCluster.getNotifier();
        drone.on(type, listener);
    }

    /**
     * Execute a task described by a JSON string.
     * @param {any} task_json 
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
     * @param {Int} CID - Connection ID.
     * @param {String} msg - Message to be sent.
     * @param {Function} callback - Callback function.
     * @memberof UserModule
     */
    sendMsg(CID, msg, callback) {
        this.droneCluster.getDrone(CID).writeDataToPi(msg, callback);
    }

    /**
     * Get the status of one single drone.
     * @param {Int} CID - Connection ID
     * @returns {Object} An object which contains CID,Armd,Mode,Lat,Lon,Alt
     * @memberof UserModule
     */
    getStatus(CID) {
        return this.droneCluster.getDrone(CID).getStatus();
    }
}


module.exports = {
    UserModule: UserModule,
    console: require('../monitor-app/module/console'),
    wd: require('../monitor-app/module/window')
}