/**
 * @file Initialize the main page of application
 * @author whxru
 */

const { DroneCluster } = require('../../monitor/drone_cluster.js');

// The AMap Circle of geofence
let geofence_circle = null;
// Whether update the lat and lon on click the mapwhen set geofence
let pick_coordinate_enable = false;
// The points ploted on map
let points = []

window.onload = () => {
    initMap();
};

/** Initialize the map */
function initMap() {
    // Initialize the map module
    var map = new AMap.Map('map-container', {
        zoom: 18,
        center: [118.8193952, 31.8872318],
        layers: [new AMap.TileLayer.Satellite(), new AMap.TileLayer.RoadNet()],
        features: ['bg', 'point', 'road', 'building']
    });

    // Keep object and class of map module alive
    global.Map = AMap;
    global.map = map;

    // Update lat and lon when clicking the map
    map.on('click', (evt) => {
        if(pick_coordinate_enable) {
            var lat = evt.lnglat.getLat()
            var lon = evt.lnglat.getLng();
            document.getElementById('geofence-lat').value = lat;
            document.getElementById('geofence-lon').value = lon;
        }
    });

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
        initMenu(droneCluster);
    });
}
    

/**
 * Map manipulation module.
 * @module Map
 */
module.exports = {
    /**
     * Preload map and the icon of drone according to the location of home.
     * @param {number} CID - Connection ID
     * @param {object} home - Latitude and longitude of home
     * @returns {Object} Object that contains marker and trace
     */
    'preloadMap': (CID, home) => {
        var map = global.map;
        var Map = global.Map;
        // Set the center position of map
        var centerPos = new Map.LngLat(home.Lon, home.Lat);
        map.panTo(centerPos);
        // Initialize the marker
        var marker = new Map.Marker({
            map: map,
            position: centerPos,
            offset: new Map.Pixel(-8, -8),
            zoom: 18,
            icon: new Map.Icon({
                size: new Map.Size(16, 16),
                image: `img/drone-${(CID - 1) % 5 + 1}.png` 
            }),
            title: `drone-${CID}`,
            autoRotation: true
        });
        // Initialize the trace
        var trace_color = ["#d71e06", "#bf08f0", "#1392d4", "#73ac53", "#f4ea2a"]
        var trace = new Map.Polyline({
            map: map,
            path: [],
            strokeColor: trace_color[(CID - 1) % 5], 
            strokeOpacity: 1,       
            strokeWeight: 2,        
            strokeStyle: "solid",   
            strokeDasharray: [10, 5] 
        });

        return {
            'marker': marker,
            'trace': trace
        };
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
                    label: '连接真机',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {droneCluster.addDrone()}
                },
                {
                    label: '连接模拟器',
                    accelerator:'CmdOrCtrl+Shift+N',
                    click: () => {
                        var input_str = `
                                <p><label>数量:</label><input type="number" min="2" max="50" id="drone-num"></p>
                            `;
                        var container = document.createElement('div');
                        document.body.appendChild(container);
                        container.className = 'input-container';
                        container.innerHTML = input_str;
                        var btn = document.createElement('button');
                        container.appendChild(btn);
                        btn.innerText = '开始连接';
                        btn.onclick = () => {
                            var num = document.getElementById('drone-num').value;
                            document.body.removeChild(document.getElementsByClassName('input-container')[0]);
                            droneCluster.addDrone(num);
                        }
                    }
                }
            ]
        },
        {
            label: '任务',
            submenu: [
                {
                    label: '从文件执行',
                    click: () => {
                        // Clear the previous trace
                        droneCluster.clearTrace();
                        // Pick a task file
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
                },
                {
                    label: '设置地理围栏',
                    click: () => {
                        if(!document.getElementsByClassName('input-container')[0]) {
                            // Enable updating lat and lon when clicking the map
                            pick_coordinate_enable = true;
                            var cursor = global.map.getDefaultCursor();
                            cursor_path = require('path').join(__dirname, '/monitor-app/main/monitor.html');
                            global.map.setDefaultCursor("crosshair");
                            // Create inputs
                            var geofence_input_str = `
                                <p><label>Latitude:</label><input type="number" min="-90" max="90" id="geofence-lat"></p>
                                <p><label>Longitude:</label><input type="number" min="-180" max="180" id="geofence-lon"></p>
                                <p><label>Radius:</label><input type="number" min="0" id="geofence-rad"></p>
                            `;
                            var container = document.createElement('div');
                            document.body.appendChild(container);
                            container.className = 'input-container';
                            container.innerHTML = geofence_input_str;
                            var btn = document.createElement('button');
                            container.appendChild(btn);
                            btn.innerText = '设置地理围栏';
                            // After clicking the buttion
                            btn.onclick = (e) => {
                                // Disable updating
                                pick_coordinate_enable = false;
                                global.map.setDefaultCursor(cursor);
                                // Get parameters of geofence inputted
                                var lat = parseFloat(document.getElementById('geofence-lat').value);
                                var lon = parseFloat(document.getElementById('geofence-lon').value);
                                var rad = parseFloat(document.getElementById('geofence-rad').value);
                                if(!(lat && lon && rad)) {
                                    return;
                                }
                                // Send message to drones
                                droneCluster.setGeofence(rad, lat, lon);
                                // Remove the container
                                var container = e.target.parentNode;
                                container.parentNode.removeChild(container);
                                // Clear previous circle
                                if(geofence_circle) {
                                    geofence_circle.setMap(null);
                                }
                                // Draw circle on the map
                                geofence_circle = new global.Map.Circle({
                                    center: [lon, lat],
                                    radius: rad,
                                    fillOpacity: 0.1,
                                    strokeWeight: 1
                                })
                                geofence_circle.setMap(global.map);
                            };
                        }
                    }
                },
                {
                    label: '连接地址',
                    accelerator: 'CmdOrCtrl+H',
                    click: () => {
                        var { publicIp, broadcastAddr } = droneCluster.getConnectionInfo();
                        const {app, dialog} = require('electron').remote;
                        dialog.showMessageBox({
                            title: 'IPv4 address',
                            message: `public IP: ${publicIp}\n`+
                            `Address of broadcast: ${broadcastAddr}`
                        });
                    }
                }
            ]
        },
        {
            label: '查看',
            submenu: [
                {
                    label: '移动距离',
                    click: () => {
                        const { app, dialog } = require('electron').remote;
                        dialog.showMessageBox({
                            title: 'Distance',
                            message: `Total distance: ${droneCluster.getTotalDistance()}`
                        })
                    }
                }
            ]
        },
        {
            label: '绘制',
            submenu: [
                {
                    label: '绘制点集',
                    click: () => {
                        var oldPoints = [];
                        // Clear previous points
                        while(points.length > 0) {
                            var marker = points.shift();
                            oldPoints.push([marker.getPosition().getLat(), marker.getPosition().getLng()]);
                            marker.setMap(null);
                        }
                        var dialog = openCustomizedDialog('plot-points', JSON.stringify(oldPoints));
                        // Plot new points
                        dialog.on('closed', () => {
                            var newPoints = JSON.parse(localStorage.getItem('dialog-return'));
                            var Map = global.Map;
                            var map = global.map;
                            var originPos = []
                            newPoints.forEach((point, index) => {
                                // The point O
                                var curPos = []
                                if(index === 0) {
                                    originPos = [point[1], point[0]]
                                    return;
                                } else {
                                    // Points relative to the point O
                                    const rEarth = 6378137.0;
                                    var dEast = point[0];
                                    var dNorth = point[1];
                                    var oriLat = originPos[1]
                                    var oriLon = originPos[0]
                                    var dLat = dNorth / rEarth; 
                                    var dLon = dEast / (rEarth * Math.cos(Math.PI * oriLat / 180));
                                    var newLat = oriLat + (dLat * 180 / Math.PI);
                                    var newLon = oriLon + (dLon * 180 / Math.PI);
                                    curPos = [newLon, newLat];
                                }
                                // Plot point
                                points.push(new Map.Marker({
                                    map: map,
                                    offset: new Map.Pixel(-8, -8),
                                    icon: new Map.Icon({
                                        size: new Map.Size(16, 16),
                                        image: `img/target.png`
                                    }),
                                    position: curPos
                                }));
                            })
                        })
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


