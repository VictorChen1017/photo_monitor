
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

        // 載入ol 
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap 貢獻者',
                    maxZoom: 18,
                }).addTo(map);

        // 圖層控制
        var heatLayer; 
        var pointLayer; 
        var pointboxLayer; // 優化的點圖層
        

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

        // 這裡的fetch 有點資料跟熱度圖 之後會把點資料拿掉
        fetch("map/query.php")
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

            

            document.getElementById('loading').innerHTML = "加載完成，點擊地圖查詢附近站點";
        })
        .catch(error => {
            console.error("載入資料失敗：", error);
            document.getElementById('loading').innerHTML = "❌ 資料載入失敗：" + error.message;
        });

        // 對於點圖層進行優化

        pointboxLayer = L.layerGroup();
  
        loadPoints(map.getBounds()); // 載入當前視野範圍

        // 當地圖移動或縮放完成後，重新載入範圍內資料

        // 加入防抖事件監聽
        let moveTimer;
        map.on('moveend', function() {
            clearTimeout(moveTimer);
            moveTimer = setTimeout(() => {
                loadPoints(map.getBounds());
            }, 300); // ← 延遲 300ms
        });

        


        // 使用函數 每次移動時執行

        function loadPoints(bounds) {

        const bbox = {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
        };

            // 傳給後端
            // 這裡的php請求格式有更新 在移動時傳送目前視野範圍
        fetch(`map/query_box.php?north=${bbox.north}&south=${bbox.south}&east=${bbox.east}&west=${bbox.west}`)
            .then(response => response.json())
            .then(data => {
                pointboxLayer.clearLayers(); // 清除舊資料

                const maxYear = new Date().getFullYear(); // 取得最新年份

        

                data.forEach(d => {
                    if (d.gps_latitude && d.gps_longitude) {

                        const year = new Date(d.time).getFullYear();

                        // 根據與最大年份的距離決定顏色
                        let color;
                        if (year === maxYear) color = "#1500feff";        // 最新年份
                        else if (year === maxYear - 1) color = "#9546f6ff"; // 前一年
                        else if (year === maxYear - 2) color = "#e47bf7ff"; // 前兩年
                        else if (year === maxYear - 3) color = "#e69adfff"; // 前三年
                        else color = "#3a3b3cff"; // 🔵 其他年份（舊資料）

                        const marker = L.circleMarker([d.gps_latitude, d.gps_longitude], {
                            radius: 3,
                            color: color,
                            weight: 1,
                            fillOpacity: 0.6
                        }).addTo(pointboxLayer);

                        const tooltipHtml = `📸 ID: ${d.id}<br>🕒 ${d.time}`;

                        // 🔹 改為滑鼠事件動態生成標籤

                        marker.on("mouseover", function(e) {
                            const tooltip = L.tooltip({
                                direction: "top",
                                opacity: 0.9,
                                className: "photo-tooltip"
                            })
                            .setContent(tooltipHtml)
                            .setLatLng(e.latlng)
                            .addTo(map);
                            marker._tempTooltip = tooltip; // 暫存 tooltip 參考
                        });

                        // 處理滑鼠移開後隱藏

                        marker.on("mouseout", function() {
                            if (marker._tempTooltip) {
                                map.removeLayer(marker._tempTooltip);
                                marker._tempTooltip = null;
                            }
                        });

                    pointboxLayer.addLayer(marker);
                        
                    }
                });

    
                // 
            })
            .catch(err => console.error("載入點失敗：", err));

            }



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


        document.getElementById("boxpoints").addEventListener("click", function() {
            if (map.hasLayer(pointboxLayer)) {
                map.removeLayer(pointboxLayer);
            } else {
                map.addLayer(pointboxLayer);
            }
        });

        document.getElementById("heatmapBtn").addEventListener("click", function() {
            if (map.hasLayer(heatLayer)) {
                map.removeLayer(heatLayer);
            } else {
                map.addLayer(heatLayer);
            }
        });





    });



});