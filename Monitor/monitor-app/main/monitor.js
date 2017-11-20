/**
 * @file Initialize the main page of application
 * @author whxru
 */

const { DroneCluster } = require('../../monitor/drone_cluster.js');

window.onload = () => {
    initMap();
};

/** Initialize the map */
function initMap() {
    // Initialize the map module
    var map = new AMap.Map('map-container', {
        zoom: 18,
        center: [116.397128, 39.916527],
        layers: [new AMap.TileLayer.Satellite(), new AMap.TileLayer.RoadNet()],
        features: ['bg', 'point', 'road', 'building']
    });

    // Keep object and class of map module alive
    global.Map = AMap;
    global.map = map;

    // Open a modal window to select a network interface
    var interfaceNames = Object.keys(require('os').networkInterfaces());
    var dialog = openCustomizedDialog('select-interface', interfaceNames.join())

    // Once the selection is confirmed
    dialog.on('closed', (evt) => {
        // Get interface's name which was selected
        var interfaceName = localStorage.getItem('dialog-return');
        // Create drone cluster
        var droneCluster = new DroneCluster(interfaceName);
        // Initialize the menu of application
        initMenu(droneCluster);
    });
}
    

/**
 * Map manipulation module.
 * @module Map
 */
module.exports = {
    /**
     * Preload map and the icon of drone according to the location of home
     * @param {number} CID - Connection ID
     * @param {object} home - Latitude and longitude of home
     * @returns {Marker} The object of marker on map which stands for a drone
     */
    'preloadMap': (CID, home) => {
        var map = global.map;
        var Map = global.Map;
        // 移动地图
        var centerPos = new Map.LngLat(home.Lon, home.Lat);
        map.panTo(centerPos);
        // 设置Marker
        var marker = new Map.Marker({
            map: map,
            position: centerPos,
            zoom: 18,
            icon: `img/drone-${CID}.png`,
            title: `drone-${CID}`,
            autoRotation: true
        });
        return marker;
    },

    /**
     * Update the position of marker
     * @param  {Marker} marker - Object of marker
     * @param  {object} state_obj - Object of state the drone currently on
     */
    'updateState': (marker, state_obj) => {
        var Map = global.Map;
        var target =new Map.LngLat(state_obj.Lon, state_obj.Lat);
        marker.setPosition(target);
    }
}


/** Initilize the menu of application */
function initMenu(droneCluster){
    const Menu = require('electron').remote.Menu;
    const template = [
        {
            label: '连接',
            submenu: [
                {
                    label: '创建连接',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {droneCluster.addDrone()}
                }
            ]
        },
        {
            label: '任务',
            submenu: [
                {
                    label: '从文件执行',
                    click: () => {
                        const {dialog} = require('electron').remote;
                        var filepaths = dialog.showOpenDialog({
                            filters: [{
                                name: 'MAVCluster task file',
                                extensions:['json', 'txt']
                            }]
                        });
                        if(filepaths !== undefined) {
                            require('fs').readFile(filepaths[0], 'utf-8', (err, content) => {
                                if(err) {
                                    dialog.showErrorBox("Error", err.message);
                                } else {
                                    droneCluster.executeTask(content);
                                }
                            });
                        }
                    }
                }
            ]
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '关于',
                    click: ()=>{
                        const {app, dialog} = require('electron').remote;
                        dialog.showMessageBox({
                            title: `MAVCluster-Monitor v${app.getVersion()}`,
                            message: `Node version: ${process.versions.node}\n`+
                            `Chrome version: ${process.versions.chrome}\n`+
                            `Electron version: ${process.versions.electron}\n`+
                            `email: seuhuangziyao@outlook.com`
                        });
                    }
                }
            ]
        }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}
/**
 * Open customized dialog
 * @param {String} type - Type of dialog 
 * @param {String} args - Arguments the dialog's initializaion needed
 * @returns {BrowserWindow} Object of dialog window
 */
function openCustomizedDialog(type, args) {
    // Customized title
    const titles = {
        'select-interface': '选择网络接口'
    }

    const sizes = {
        'select-interface': {
            height: 150,
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


