/**
 * @file 初始化主界面
 * @author whxru
 */

const { DroneCluster } = require('../monitor/drone_cluster.js');

window.onload = () => {
    // 创建无人机集群
    var droneCluster = new DroneCluster();

    // 初始化菜单
    initMenu(droneCluster);

    // 异步加载腾讯地图，回调函数为initMap
    var script = document.createElement('script');
    script.type = "text/javascript";
    script.async = true;
    script.src = "http://map.qq.com/api/js?v=2.exp&callback=initMap";
    var firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(script, firstScript);

};

/**
 * 初始化地图模块，向外提供部分地图操纵的接口
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

    /**
     * Map manipulation module.
     * @module Map
     */
    module.exports.Map = {
        /** 腾讯地图中描述经纬度的类 */
        'LatLng': qq.maps.LatLng,
        
        /**
         * 根据HOME的位置预加载地图，初始化无人机在地图上的标志
         * @param {number} CID - Connection ID
         * @param {object} home - 包含经纬度信息的位置
         * @returns 该CID无人机对应的Marker对象
         */
        'preloadMap': (CID, home) => {
            // 移动地图
            var Maps = qq.maps;
            var centerPos = new Maps.LatLng(home.Lat, home.Lon);
            map.panTo(centerPos);
            // 设置Marker
            var marker = new Maps.Marker({
                position: centerPos,
                animation: Maps.MarkerAnimation.UP,
                map: map,
                draggable: false,
                icon: new Maps.MarkerImage(`img/drone-${CID}.png`),
                title: `drone-${CID}`,
                autoRotation: true
            });
            return marker;
        }
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
                    click: droneCluster.addDrone
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


