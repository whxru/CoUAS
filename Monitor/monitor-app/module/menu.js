const wd = require('./window')

/** Initilize the menu of application */
function initMenu(droneCluster) {
    const Menu = require('electron').remote.Menu;
    const template = [
        {
            label: 'New',
            submenu: [
                {
                    label: 'Real drone',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => { droneCluster.addDrone() }
                },
                {
                    label: 'Simulators',
                    accelerator: 'CmdOrCtrl+Shift+N',
                    click: () => {
                        var inputSet = new wd.InputSet().showOnTop();
                        var num = inputSet.addInput('Number', {
                            type: 'number', min: 1, max: 50
                        });
                        var btn = inputSet.addButton('Start', (evt) => {
                            var sitlNum = num.value;
                            inputSet.remove();
                            if( sitlNum ) {
                                droneCluster.addDrone(num);
                            }
                        });
                    }
                }
            ]
        },
        {
            label: 'Task',
            submenu: [
                {
                    label: 'Open a task file',
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
                    label: 'Set geo-fence',
                    click: () => {
                        var inputSet = new wd.InputSet({ title: 'Geo-fence' }).showOnTop();
                        var lat = inputSet.addInput('Latitude', {
                            type: 'number', min: '-90', max: '90'
                        });
                        var lon = inputSet.addInput('Longitude', {
                            type: 'number', min: '-180', max: '180'
                        });
                        var rad = inputSet.addInput('Radius', {
                            type: 'number', min: '0'
                        })
                        var btn = inputSet.addButton('Confirm', (evt) => {
                            var [lat_v, lon_v, rad_v] = [parseFloat(lat.value), parseFloat(lon.value), parseFloat(rad.value)]
                            if(!(lat_v && lon_v && rad_v)) {
                                return;
                            }
                            
                            inputSet.remove();
                            droneCluster.setGeofence(rad_v, lat_v, lon_v);
                            global.mapModule.setGeofence(rad_v, lat_v, lon_v)
                            global.mapModule.setCursor('default');
                        });

                        var btn = inputSet.addButton('Cancel', (evt) => {
                            inputSet.remove();
                        })
                    }
                },
                {
                    label: 'Address',
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
            label: 'Info',
            submenu: [
                {
                    label: 'Distance',
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
            label: 'Plot',
            submenu: [
                {
                    label: 'Plot points',
                    click: () => {
                        // Clear previous points
                        var oldPoints = global.mapModule.clearPoints();
                        var inputSet = new wd.InputSet({
                            title: 'Plot Points',
                            middle: true,
                            modal: true
                        }).showOnTop();
                        var textarea = inputSet.addTextarea({ rows: 20 });
                        textarea.value = JSON.stringify(oldPoints, null, '\t');
                        inputSet.addButton('Confirm', (evt) => {
                            var newPoints = JSON.parse(textarea.value);
                            global.mapModule.plotPoints(newPoints);
                            inputSet.remove();
                        });
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
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