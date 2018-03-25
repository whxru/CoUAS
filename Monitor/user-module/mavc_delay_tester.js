/** 
 * @description Before using this module, you must make sure that clocks on PC and RPis has been synchronized.
 * NTP server is recommended.
 */

const { UserModule, MAVC } = require('./user_module');

class ModuleDelayTester extends UserModule {
    constructor(droneCluster) {
        super('Delay-Tester', droneCluster);

        this._responses = [];

        this.addCommand('Test', () => {
            if (this.getDroneNum() === 0) return;

            this.listenAckMsg();
            this.broadcastMsg([
                {
                    "Header": "MAVCluster_Drone",
                    "Type": MAVC.MAVC_DELAY_TEST,
                },
                {
                    "Send_time": new Date().getTime()
                }
            ]);
        })
    }

    listenAckMsg() {
        this._responses = [];
        this.addMsgListener('message-in', (CID, msg) => {
            if(msg[0].Type === MAVC.MAVC_DELAY_RESPONSE) {
                msg[1]['Ack_time'] = Date.now();
                msg[1]['Get_time'] = Math.floor(msg[1]['Get_time']);
                this._responses.push(msg[1]);
                if (this._responses.length === this.getDroneNum()) {
                    // After getting all acks
                    var min = Date.now(),
                        max = 0;
                    this._responses.forEach(resp => {
                        var gt = resp.Get_time;
                        if (gt > max) max = gt;
                        if (gt < min) min = gt;
                    })
                    myConsole.log(`Max delay of get_time: ${max-min}`, 'green');
                }
            }
        });
    }
}

module.exports.init = function(droneCluster) {
    new ModuleDelayTester(droneCluster);
}