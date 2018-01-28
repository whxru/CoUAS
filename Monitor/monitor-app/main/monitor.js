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
    selectInterface();
};

/**
 * Select interface of network and initialize the menu.
 */
function selectInterface() {
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
        // Initialize menu and console
        menu.initMenu(droneCluster);
        console.show();
    });
}



