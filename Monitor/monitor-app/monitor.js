/**
 * @file 初始化主界面
 * @author whxru
 */

const { DroneCluster } = require('../monitor/drone_cluster.js');

window.onload = () => {
    initMap();
};

/** 初始化地图 */
function initMap() {
    // 初始化菜单
    initMenu(droneCluster);
    
    // 初始化地图模块
    // var centerPos = new Maps.LatLng(31.8872318,118.8193952);
    var map = new AMap.Map('map-container', {
        zoom: 18,
        center: [116.397128, 39.916527],
        layers: [new AMap.TileLayer.Satellite(), new AMap.TileLayer.RoadNet()],
        features: ['bg', 'point', 'road', 'building']
    });

    global.Map = AMap;
    global.map = map;

    // 创建无人机集群
    var droneCluster = new DroneCluster();

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
        var Map = global.Map;
        // 移动地图
        var centerPos = new Map.LngLat(home.Lon, home.Lat);
        map.panTo(centerPos);
        // 设置Marker
        var marker = new Maps.Marker({
            map: map,
            position: centerPos,
            animation: "AMAP_ANIMATION_BOUNCE",
            // draggable: false,
            icon: `img/drone-${CID}.png`,
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
        var Map = global.Map;
        var target =new Map.LngLat(state_obj.Lon, state_obj.Lat);
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


