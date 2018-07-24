const wd = require('./window')
const console = require('./console')
const Menu = require('electron').remote.Menu;
const MenuItem = require('electron').remote.MenuItem;
const transform = require('../../monitor/lib/transform');


/**
 * Initialize the menu of application.
 * @param {DroneCluster} droneCluster - Instance of DroneCluster. 
 */
function initMenu(droneCluster) {
    var template = [
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
                                droneCluster.addDrone(sitlNum);
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
                    accelerator: 'CmdOrCtrl+O',
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
                                    require('fs').writeFile("../result_sitl.txt", require('path').basename(filepaths[0]) + '\r\n', {flag: 'a'}, err => {
                                        if (err) {
                                            dialog.showErrorBox("Error", err.message);
                                        } else {
                                            console.log("Start to log");
                                            droneCluster.executeTask(content);
                                        }
                                    })
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
                }
            ]
        },
        {
            label: 'Info',
            submenu: [
                {
                    label: 'Task info',
                    accelerator: 'CmdOrCtrl+I',
                    click: () => {
                        const { app, dialog } = require('electron').remote;
                        var distances = droneCluster.getDistances()
                        var taskTimes = droneCluster.getTaskTimes()
                        msg = '';
                        distances.forEach((distance, idx) => {
                            msg += `Drone-${idx + 1}: ${distance}m\n`
                        })
                        taskTimes.forEach((taskTime, idx) => {
                            msg += `Drone-${idx + 1}: ${taskTime}s\n`
                        })
                        dialog.showMessageBox({
                            title: 'Task info',
                            message: msg
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
            label: 'Plot',
            submenu: [
                {
                    label: 'Points',
                    click: () => {
                        // Clear previous points
                        var oldPoints = global.mapModule.clearPoints();
                        var inputSet = new wd.InputSet({
                            title: 'Plot Points',
                            middle: true,
                            modal: true
                        }).showOnTop();
                        var textarea = inputSet.addTextarea({ rows: 15 });
                        textarea.value = JSON.stringify(oldPoints, null, '\t');
                        inputSet.addButton('Confirm', (evt) => {
                            var newPoints = JSON.parse(textarea.value);
                            global.mapModule.plotPoints(newPoints);
                            inputSet.remove();
                        });
                    }
                },
                {
                    label: 'Trace',
                    click: () => {
                        const { dialog } = require('electron').remote;
                        var filepaths = dialog.showOpenDialog({
                            filters: [{
                                name: 'Ardupilot log file',
                                extensions: ['log']
                            }]
                        });
                        if (filepaths !== undefined) {
                            require('fs').readFile(filepaths[0], 'utf-8', (err, content) => {
                                if (err) {
                                    dialog.showErrorBox("Error", err.message);
                                } else {
                                    var traceArr = [];
                                    var lines = content.split('\n');
                                    lines.forEach(line => {
                                        if (line.startsWith("GPS,")) {
                                            var attrValues = line.split(",");
                                            var lat = parseFloat(attrValues[7]);
                                            var lng = parseFloat(attrValues[8]);
                                            var gcjCoord = transform.wgs2gcj(lat, lng);
                                            traceArr.push([gcjCoord.lng, gcjCoord.lat]);
                                        }
                                    })
                                    global.mapModule.plotTrace(traceArr);
                                }
                            });
                        }
                    }
                }
            ]
        },
        {
            label: 'Console',
            submenu: [
                {
                    label: 'Show',
                    click: () => { console.show(); }
                },
                {
                    label: 'Hidde',
                    click: () => { console.hidde(); }
                }
            ]
        },
        {
            label: 'Module',
            submenu: [

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

/**
 * Get the index of menuitem 'module' in template.
 * @returns {Int} Index of 'module', -1 if not found.
 */
function getUserModuleIndex() {
    var index = -1;
    Menu.getApplicationMenu().items.forEach((item, idx) => {
        if(item.label === 'Module') {
            index = idx;
        }
    })
    return index;
}

/**
 * Add a user's module into the 'module'.
 * @param {String} name - Name of user's module.
 */
function addUserModule(name) {
    var menu = Menu.getApplicationMenu();
    var moduleMenu = menu.items[getUserModuleIndex()].submenu;
    moduleMenu.append(new MenuItem({
        'label': name,
        'submenu': []
    }));
    Menu.setApplicationMenu(menu);
}

/**
 * Get the index of user's module in 'module'.
 * @param {String} name - Name of user's module.
 * @returns {Int} The index.
 */
function getUserModuleItemIndex(name) {
    var index = -1;
    Menu.getApplicationMenu().items[getUserModuleIndex()].submenu.items.forEach((module, idx) => {
        if(module.label === name) {
            index = idx;
        }
    });

    // No such user's module, add one.
    if(index === -1) {
        addUserModule(name);
        return getUserModuleIndex(name);
    } else {
        return index;
    }
}

/**
 * Add an item to the menu of user's module.
 * @param {String} name - Name of user's module.
 * @param {String} label - Label of this item.
 * @param {Function} onclick - Handler of clicking this item.
 */
function addUserModuleItem(name, label, onclick) {
    var menu = Menu.getApplicationMenu();
    var moduleSubmenu = menu.items[getUserModuleIndex()].submenu.items[getUserModuleItemIndex(name)].submenu;
    moduleSubmenu.append(new MenuItem({
        'label': label,
        'click': onclick
    }));
    Menu.setApplicationMenu(menu);
}

module.exports = {
    initMenu: initMenu,
    addUserModule: addUserModule,
    addUserModuleItem: addUserModuleItem, 
};