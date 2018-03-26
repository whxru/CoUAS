/** 
 * @description Before using this module, you must make sure that clocks on PC and RPis has been synchronized.
 * NTP server is recommended.
 */

const { UserModule, MAVC, myConsole } = require('./user_module');

class ModuleDelayTester extends UserModule {
    constructor(droneCluster) {
        super('Delay-Tester', droneCluster);

        this._init = false;
        this._responses = [];

        this.addCommand('Test', () => {
            if (this.getDroneNum() === 0) return;

            this._responses = [];
            
            if (!this._init) {
                this.listenAckMsg();
                this._init = true;
            }

            this.broadcastMsg([
                {
                    "Header": "MAVCluster_Monitor",
                    "Type": MAVC.MAVC_DELAY_TEST,
                },
                {
                    "Send_time": Date.now()
                }
            ]);
        })
    }

    listenAckMsg() {
        this.addMsgListener('message-in', (CID, msg) => {
            if (msg[0].Type === MAVC.MAVC_DELAY_RESPONSE) {
                msg[1]['Ack_time'] = Date.now();
                // msg[1]['Get_time'] = parseInt(msg[1]['Get_time']*1e3);
                myConsole.log(`Transfer delay of drone-${CID}: ${msg[1]['Get_time'] - msg[1]['Send_time']}ms`, 'green');
                myConsole.log(`RTT of drone-${CID}: ${msg[1]['Ack_time'] - msg[1]['Send_time']}ms`, 'green');
                this._responses.push(msg[1]);
                if (this._responses.length === this.getDroneNum()) {
                    // After getting all acks
                    var max = Date.now(),
                        min = 0;
                    this._responses.forEach(resp => {
                        var gt = resp.Get_time;
                        if (gt > max) max = gt;
                        if (gt < min) min = gt;
                    })
                    myConsole.log(`Max difference of transfer delay: ${max-min}ms`, 'green');
                }
            }
        });
    }
}

module.exports.init = function(droneCluster) {
    new ModuleDelayTester(droneCluster);
}