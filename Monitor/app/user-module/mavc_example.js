const { UserModule, myConsole, wd } = require('./user_module')

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
         // Call constructor of UserModule, it'll add an item to menu for this module
        super(name, droneCluster);

        // Add command to menu
        this.addCommand('Console', () => {
            // Print message on myConsole.
            myConsole.log("This is a message printed by ExampleModule");
        })

        this.addCommand('Input', () => {
            // Create an dialog to wait for user's input and show it
            var inputSet = new wd.InputSet({
                'title': 'Example Title',
                'middle': true, // vergical align
                'modal': true
            }).showOnTop();

            // Add a <select> element to the dialog
            var select = inputSet.addSelect(['select1', 'select2', 'select3']);
            // Add an <input> element to the dialog
            var input = inputSet.addInput('Input', {
                'type': 'number', 'min': '1', 'max': '50'
            });
            // Add a <textarea> element to the dialog
            var textarea = inputSet.addTextarea({ rows: 8});

            // Add a confirm button to the dialog
            var confirm = inputSet.addButton('Confirm', () => {
                // Get value of elements
                var selectedValue = select.options[select.selectedIndex].value;
                var input_str = input.value;
                var textarea_str = textarea.value;
                // Remove this dialog
                inputSet.remove()
                // Print user's input on myConsole
                myConsole.log('SELECTED: ' + selectedValue);
                myConsole.log('INPUT: ' + input_str);
                myConsole.log('TEXTAREA: ' + textarea_str);
            });
            
            // Add a cancel button to the dialog
            var cancel = inputSet.addButton('Cancel', () => {
                // Remove this dialog
                inputSet.remove();
            })
        })

        // Handle every message sent by drone
        this.addMsgListener('message-in', (CID, msg_obj) => {
            myConsole.log(JSON.stringify(msg_obj), 'green');
        });
        
        // Handle every message sent by monitor
        this.addMsgListener('message-out', (CID, msg_obj) => {
            myConsole.log(JSON.stringify(msg_obj), 'pink');
        })
    }
}

// The init function will be called automatically while loading this module.
function init(droneCluster) {
    new ExampleModule('example', droneCluster);
}

module.exports.init = init;