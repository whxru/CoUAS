/**
 * @file Initialize the main page of application
 * @author whxru
 */

const { DroneCluster } = require('../../monitor/drone_cluster');
const console = require('../module/console')
const menu = require('../module/menu')
const map = require('../module/map')
const wd = require('../module/window')

window.onload = () => {
    // Initialize the map
    global.mapModule = new map.MapModule(AMap, 'map-container');
    initApplication();
};

/**
 * Select interface of network and initialize the menu.
 */
function initApplication() {
    // Select interface
    var interfaceNames = Object.keys(require('os').networkInterfaces());
    var inputSet = new wd.InputSet({
        title: 'Select Interface',
        middle: true,
        modal: true
    }).showOnTop();
    var select = inputSet.addSelect(interfaceNames);
    inputSet.addButton('Confirm', (evt) => {
        var interfaceName = select.options[select.selectedIndex].value;
        inputSet.remove();
        var droneCluster = new DroneCluster(interfaceName);
        // Initialize menu
        menu.initMenu(droneCluster);
        // Initialize console
        console.show();
        // Load user's module
        require('fs').readFile('user-module/load.json', 'utf-8', (err, content) => {
            if(err) {
                console.error(err.message);
            } else {
                var userModuleList = JSON.parse(content);
                userModuleList.forEach((name) => {
                    var mod = require(`../../user-module/${name}`);
                    mod.init(droneCluster);
                });
            }
        })
    });
}



