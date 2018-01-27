/**
 * @file Initialize the main page of application
 * @author whxru
 */

const { DroneCluster } = require('../../monitor/drone_cluster');
const menu = require('../module/menu')
const map = require('../module/map')
const wd = require('../module/window')

window.onload = () => {
    // Initialize the map
    mapModule = new map.MapModule(AMap, 'map-container');
    global.mapModule = mapModule;

    // Open a modal window to select a network interface
    var interfaceNames = Object.keys(require('os').networkInterfaces());
    var dialog = wd.openCustomizedDialog('select-interface', interfaceNames)

    // Once the selection is confirmed
    dialog.on('closed', (evt) => {
        // Get interface's name which was selected
        var interfaceName = localStorage.getItem('dialog-return');
        // Create drone cluster
        var droneCluster = new DroneCluster(interfaceName);
        // Initialize the menu of application
        menu.initMenu(droneCluster);
    });
};




