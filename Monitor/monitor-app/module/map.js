const transform = require('../../monitor/lib/transform.js')

/**
 * Manage the map in application.
 * @class MapModule
 */
class MapModule {
    /**
     * Creates an instance of MapModule.
     * @param {any} AMap - Object of AMap
     * @param {any} id - ID of container
     * @memberof MapModule
     */
    constructor(AMap, id) {
        // Create map
        this.Map = AMap
        this.map = new AMap.Map('map-container', {
            expandZoomRange: true,
            zoom: 18,
            zooms: [3, 20],
            center: [118.8193952, 31.8872318],
            layers: [new AMap.TileLayer.Satellite(), new AMap.TileLayer.RoadNet()],
            features: ['bg', 'point', 'road', 'building']
        });

        // Update lat and lon when clicking the map
        this.pick_coordinate_enable = false;
        this.map.on('click', (evt) => {
            if (this.pick_coordinate_enable) {
                var lat = evt.lnglat.getLat()
                var lon = evt.lnglat.getLng();
                document.getElementById('geofence-lat').value = lat;
                document.getElementById('geofence-lon').value = lon;
            }
        });
    }

    /**
     * Preload map and the icon of drone according to the location of home.
     * @param {number} CID - Connection ID
     * @param {object} home - Latitude and longitude of home
     * @returns {Object} Object that contains marker and trace
     * @memberof MapModule
     */
    preloadMap(CID, home) {
        var map = this.map;
        var Map = this.Map;

        // Set the center position of map
        var centerPos_mars = transform.wgs2gcj(home.Lat, home.Lon);
        var centerPos = new Map.LngLat(centerPos_mars.lng, centerPos_mars.lat)
        map.panTo(centerPos);

        // Initialize the marker
        var marker = new Map.Marker({
            map: map,
            position: centerPos,
            offset: new Map.Pixel(-8, -8),
            zoom: 19,
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

    /**
     * Calculate the distance between two positions.
     * @param {Object} prePos_mars - Previous position.
     * @param {Object} curPos_mars - Current position.
     * @returns {Float} - The distance between two positions.
     * @memberof MapModule
     */
    calDistance(prePos_mars, curPos_mars) {
        var prePos = new this.Map.LngLat(prePos_mars.lng, prePos_mars.lat);
        var curPos = new this.Map.LngLat(curPos_mars.lng, curPos_mars.lat);
        return curPos.distance(prePos);
    }
    
    /**
     * Set position of marker.
     * @param {AMap.Marker} marker - Object of the marker. 
     * @param {Object} pos_wgs - Position to be set in wgs.
     * @returns {Object} - Position in mars(gcj).
     * @memberof MapModule
     */
    setPosition(marker, pos_wgs) {
        var pos_mars = transform.wgs2gcj(pos_wgs.Lat, pos_wgs.Lon);
        marker.setPosition([pos_mars.lng, pos_mars.lat]);
        return pos_mars;
    }

    /**
     * Set the path (polyline).
     * @param {AMap.PolyLine} polyline - Object of path.
     * @param {Array} traceArr - Arrary of points along the path. 
     * @memberof MapModule
     */
    setPath(polyline, traceArr) {
        polyline.setPath(traceArr);
    }
}

module.exports.MapModule = MapModule;