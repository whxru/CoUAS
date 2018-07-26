const  { UserModule, myConsole } = require('./user_module');

class CollisionModule extends UserModule {
    constructor(droneCluster) {
        super('collision', droneCluster);
        this.addMsgListener('new-drone-add', () => {
            if(this.getDroneNum() === 2) {
                this.detect2DroneCollision();
            }
        });
    }

    detect2DroneCollision() {
        var minDistance = 100000;
        var drone = new Array(2);
        this.addMsgListener('message-in', (CID, msg_obj) => {
            if(msg_obj[0]['Type'] === 2) {
                drone[CID - 1] = {
                    'lat': msg_obj[1].Lat,
                    'lng': msg_obj[1].Lon,
                    'alt': msg_obj[1].Alt
                };
                if(drone[2 - CID]) {
                    var distance = UserModule.calDistance(drone[0], drone[1]);
                    if(distance < minDistance) {
                        minDistance = distance;
                        myConsole.log(`Closer: ${minDistance}m.`, 'red');
                    }
                }
            }
        })
    }
}

module.exports.init = droneCluster => {
    new CollisionModule(droneCluster);
}