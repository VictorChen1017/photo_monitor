
// 所需套件：jQuery, Leaflet.js
document.addEventListener('DOMContentLoaded', function () { // 確保資源加載完畢

    $(document).ready(function() {

        var map = L.map('map').setView([25.038, 121.5645], 15); // 設定初始中心點和縮放級別

        var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);

        var satellite = L.tileLayer(
        'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        { attribution: 'Google Satellite' }
        );

        // 載入ol 但未有圖層控制
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap 貢獻者',
                    maxZoom: 18,
                }).addTo(map);

        // 圖層控制
        var heatLayer; 
        var pointLayer; 
        

        // 定位
        map.locate({ setView: true, maxZoom: 16 });

        map.on('locationerror', function(e) {
            alert("無法取得定位：" + e.message);
        });

        map.on('locationfound', function (e) {
            L.marker(e.latlng).addTo(map)
            .bindPopup("你在這裡").openPopup();
            handleMapClick(e.latlng.lat, e.latlng.lng);
        });

        //熱度圖製作 連結資料庫
        // 回傳值data是一個json 包含經緯度資料，不須強度

    
        fetch("query.php")
        .then(response => {
            if (!response.ok) {
            throw new Error("HTTP 錯誤狀態: " + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log("後端回傳資料：", data);

            if (!Array.isArray(data)) {
            throw new Error("回傳資料不是陣列格式");
            }

            // 建立熱度圖 參數調整
            heatLayer = L.heatLayer(data, {
            radius: 20,
            blur: 20,
            maxZoom: 17,
            gradient: {
                0.0: 'blue',
                0.3: 'cyan',
                0.6: 'lime',
                0.9: 'yellow',
                1.0: 'red'
            }
            }).addTo(map);

                  // 建立點圖層
            pointLayer = L.layerGroup();
            data.forEach(function(coord) {
                var marker = L.circleMarker([coord[0], coord[1]], {
                    radius: 1,
                    color: "blue",
                    fillColor: "blue",
                    fillOpacity: 0.6
                });
                marker.addTo(pointLayer);
            });
            // 預設不顯示，需手動開啟

            document.getElementById('loading').innerHTML = "加載完成，點擊地圖查詢附近站點";
        })
        .catch(error => {
            console.error("載入資料失敗：", error);
            document.getElementById('loading').innerHTML = "❌ 資料載入失敗：" + error.message;
        });

        // 監聽底圖切換
        document.getElementById("layerSelector").addEventListener("change", function() {
            if (this.value === "osm") {
                map.addLayer(osm);
                map.removeLayer(satellite);
            } else {
                map.addLayer(satellite);
                map.removeLayer(osm);
            }
        });

        document.getElementById("togglePoints").addEventListener("click", function() {
            if (map.hasLayer(pointLayer)) {
                map.removeLayer(pointLayer);
            } else {
                map.addLayer(pointLayer);
            }
        });





    });



});