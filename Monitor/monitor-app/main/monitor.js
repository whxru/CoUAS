/**
 * @file Initialize the main page of application
 * @author whxru
 */

const { DroneCluster } = require('../../monitor/drone_cluster');
const menu = require('../module/menu')
const map = require('../module/map')

window.onload = () => {
    // Initialize the map
    mapModule = new map.MapModule(AMap, 'map-container');
    global.mapModule = mapModule;

    // Open a modal window to select a network interface
    var interfaceNames = Object.keys(require('os').networkInterfaces());
    var dialog = openCustomizedDialog('select-interface', JSON.stringify(interfaceNames))

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


/**
 * Open customized dialog
 * @param {String} type - Type of dialog 
 * @param {String} args - Arguments the dialog's initializaion needed
 * @returns {BrowserWindow} Object of dialog window
 */
function openCustomizedDialog(type, args) {
    // Customized title
    const titles = {
        'select-interface': '选择网络接口',
        'plot-points': '绘制点集'
    }

    const sizes = {
        'select-interface': {
            height: 150,
            width: 300 
        },
        'plot-points': {
            height: 500,
            width: 300
        }
    }

    // Load the html file of dialog
    const { BrowserWindow } = require('electron').remote;
    var currentWindow = require('electron').remote.getCurrentWindow();
    localStorage.setItem('dialog-type', type);
    localStorage.setItem('dialog-args', args);
    var dialog = new BrowserWindow({
        title: titles[type],
        width: sizes[type].width,
        height: sizes[type].height,
        autoHideMenuBar: true,
        closable: false,
        minimizable: false,
        maximizable: false,
        parent: currentWindow,
        modal: true,
        show: false
    });
    dialog.loadURL(require('url').format({
        pathname: require('path').join(__dirname, '../dialog/dialog.html'),
        protocol: 'file:',
        slashes: true
    }))
    dialog.once('ready-to-show', () => {
        dialog.show();
    });

    return dialog;
}


