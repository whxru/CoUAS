const { UserModule, console, wd } = require('./user_module')

/**
 * Example of developing a user's own module.
 * @class ExampleModule
 * @extends {UserModule}
 */
class ExampleModule extends UserModule {
    /**
     * Creates an instance of ExampleModule.
     * @param {String} name - The name of the module.
     * @param {DroneCluster} droneCluster - Cluster of drones.
     * @memberof ExampleModule
     */
    constructor(name, droneCluster) {
        super(name, droneCluster);

        this.addCommand('Console', () => {
            console.log("This is a message printed by ExampleModule");
        })

        this.addCommand('Input', () => {
            var inputSet = new wd.InputSet({
                'title': 'Example Title',
                'middle': true,
                'modal': true
            }).showOnTop();

            var select = inputSet.addSelect(['select1', 'select2', 'select3']);
            var input = inputSet.addInput('Input', {
                'type': 'number', 'min': '1', 'max': '50'
            });
            var textarea = inputSet.addTextarea({ rows: 8});

            var confirm = inputSet.addButton('Confirm', () => {
                var selectedValue = select.options[select.selectedIndex].value;
                var input_str = input.value;
                var textarea_str = textarea.value;
                inputSet.remove()
                console.log('SELECTED: ' + selectedValue);
                console.log('INPUT: ' + input_str);
                console.log('TEXTAREA: ' + textarea_str);
            });

            var cancel = inputSet.addButton('Cancel', () => {
                inputSet.remove();
            })
        })

        this.addMsgListener('message-in', (CID, msg_obj) => {
            console.log(JSON.stringify(msg_obj), 'green');
        });

        this.addMsgListener('message-out', (CID, msg_obj) => {
            console.log(JSON.stringify(msg_obj), 'pink');
        })
    }
}

function init(droneCluster) {
    new ExampleModule('example', droneCluster);
}

module.exports.init = init;