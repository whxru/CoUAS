/**
 * @file 初始化主界面
 * @author whxru
 */

window.onload = ()=>{
    // 初始化菜单
    initMenu();

    // 异步加载腾讯地图
    var script = document.createElement('script');
    script.type = "text/javascript";
    script.async = true;
    script.src = "http://map.qq.com/api/js?v=2.exp&callback=init";
    var firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(script, firstScript);

};

/**
 * 初始化地图模块
 * @desc 会被异步加载的腾讯地图脚本自动调用
 */
function init() {
    var Maps = qq.maps;
    var centerPos = new Maps.LatLng(31.8872318,118.8193952);
    var map = new Maps.Map(document.getElementById('map-container'), {
        mapTypeId: Maps.MapTypeId.HYBRID,
        zoom: 18
    });
    map.panTo(centerPos);
}

/** 初始化主界面菜单 */
function initMenu(){
    const Menu = require('electron').remote.Menu;
    const template = [
        {
            label: '连接',
            submenu: [
                {
                    label: '创建连接',
                    accelerator: 'CmdOrCtrl+N',
                    click: ()=>{} // to-do: Drone.addDrone()
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
