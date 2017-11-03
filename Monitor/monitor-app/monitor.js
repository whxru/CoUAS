/**
 * @file 初始化主界面
 * @author whxru
 */

const { DroneCluster } = require('../monitor/drone_cluster.js');

window.onload = () => {
    initMap();
};

/**
 * 初始化地图
 * @desc 会被异步加载的腾讯地图脚本回调
 */
function initMap() {
    // 初始化腾讯地图模块
    var Maps = qq.maps;
    // var centerPos = new Maps.LatLng(31.8872318,118.8193952);
    var centerPos = new Maps.LatLng(39.916527, 116.397128);
    var map = new Maps.Map(document.getElementById('map-container'), {
        mapTypeId: Maps.MapTypeId.HYBRID,
        zoom: 18
    });
    map.panTo(centerPos);
    global.Maps = Maps;
    global.map = map;

    // 创建无人机集群
    var droneCluster = new DroneCluster();

    // 初始化菜单
    initMenu(droneCluster);
}

/**
 * Map manipulation module.
 * @module Map
 */
module.exports = {
    /**
     * 根据HOME的位置预加载地图，初始化无人机在地图上的标志
     * @param {number} CID - Connection ID
     * @param {object} home - home的经纬度
     * @returns 该无人机对应的Marker对象
     */
    'preloadMap': (CID, home) => {
        var map = global.map;
        var Maps = global.Maps;
        // 移动地图
        var centerPos = new Maps.LatLng(home.Lat, home.Lon);
        map.panTo(centerPos);
        // 设置Marker
        var marker = new Maps.Marker({
            position: centerPos,
            animation: Maps.MarkerAnimation.UP,
            map: map,
            // draggable: false,
            icon: new Maps.MarkerImage(`img/drone-${CID}.png`),
            title: `drone-${CID}`,
            autoRotation: true
        });
        return marker;
    },

    /**
     * 更新Marker的位置
     * @param  {Marker} marker - Marker对象
     * @param  {object} state_obj - 描述无人机当前的状态
     */
    'updateState': (marker, state_obj) => {
        var Maps = global.Maps;
        var target =new Maps.LatLng(state_obj.Lat, state_obj.Lon);
        marker.moveTo(target);
    }
}


/** 初始化主界面菜单 */
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


