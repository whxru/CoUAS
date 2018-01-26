/** Initilize the menu of application */
function initMenu(droneCluster) {
    const Menu = require('electron').remote.Menu;
    const template = [
        {
            label: '连接',
            submenu: [
                {
                    label: '连接真机',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => { droneCluster.addDrone() }
                },
                {
                    label: '连接模拟器',
                    accelerator: 'CmdOrCtrl+Shift+N',
                    click: () => {
                        var input_str = `
                                <p><label>数量:</label><input type="number" min="1" max="50" id="drone-num"></p>
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
                            if (num) {
                                droneCluster.addDrone(num);
                            }
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
                        const { dialog } = require('electron').remote;
                        var filepaths = dialog.showOpenDialog({
                            filters: [{
                                name: 'MAVCluster task file',
                                extensions: ['json', 'txt']
                            }]
                        });
                        if (filepaths !== undefined) {
                            require('fs').readFile(filepaths[0], 'utf-8', (err, content) => {
                                if (err) {
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
                        if (!document.getElementsByClassName('input-container')[0]) {
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
                                // Remove the container
                                var container = e.target.parentNode;
                                container.parentNode.removeChild(container);
                                if (!(lat && lon && rad)) {
                                    return;
                                }
                                // Send message to drones
                                droneCluster.setGeofence(rad, lat, lon);
                                // Clear previous circle
                                if (geofence_circle) {
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
                        const { app, dialog } = require('electron').remote;
                        dialog.showMessageBox({
                            title: 'IPv4 address',
                            message: `public IP: ${publicIp}\n` +
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
                        var distances = droneCluster.getDistances()
                        msg = '';
                        distances.forEach((distance, idx) => {
                            msg += `Drone-${idx + 1}: ${distance}m\n`
                        })
                        dialog.showMessageBox({
                            title: 'Distance',
                            message: msg
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
                        while (points.length > 0) {
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
                                if (index === 0) {
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
                    click: () => {
                        const { app, dialog } = require('electron').remote;
                        dialog.showMessageBox({
                            title: `MAVCluster-Monitor v${app.getVersion()}`,
                            message: `Node version: ${process.versions.node}\n` +
                                `Chrome version: ${process.versions.chrome}\n` +
                                `Electron version: ${process.versions.electron}\n` +
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

module.exports.initMenu = initMenu;