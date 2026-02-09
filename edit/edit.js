
// 所需套件：jQuery, Leaflet.js
document.addEventListener('DOMContentLoaded', function () { // 確保資源加載完畢

    $(document).ready(function() {

        var map = L.map('map').setView([25.038, 121.5645], 15); // 設定初始中心點和縮放級別

                //當點擊地圖時，取得經緯度座標
        let originMarker = null;  // 照片原始位置
        let currentMarker = null; // 點擊的新位置

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

        map.addLayer(osm)

        

        // 畫面定位
        map.locate({ setView: true, maxZoom: 16 });

        map.on('locationerror', function(e) {
            alert("無法取得定位：" + e.message);
        });




        map.on('click', function(e) {
            document.getElementById('edit-lat').value = e.latlng.lat.toFixed(6);
            document.getElementById('edit-lng').value = e.latlng.lng.toFixed(6);

            // 2. 判斷是否已經有舊圖標，有的話就移除
            if (currentMarker) {
                map.removeLayer(currentMarker);
            }
            
            // 3. 建立新圖標並加到地圖上
                // 你可以自訂 Marker 的顏色或使用預設
            currentMarker = L.marker(e.latlng).addTo(map)
                .bindPopup(`<b>新位置</b>`)
                .openPopup();
            });



       document.getElementById('photo-selector').addEventListener('change', function() {
            const selected = this.options[this.selectedIndex];

            // 處理時間戳記
            if (selected.time) {
                // 將 Unix Timestamp 轉為 datetime-local 格式
                const date = new Date(parseInt(selected.time) * 1000);
                const dateString = date.toISOString().slice(0, 16);
                document.getElementById('edit-time').value = dateString;
            }

            // 處理地理位置戳記

            // 檢查 dataset 或 property 中是否存在經緯度 (依據你後端回傳的欄位名稱)
            const lat = parseFloat(selected.dataset.lat);
            const lng = parseFloat(selected.dataset.lng);

            console.log("緯度:", lat, "經度:", lng);
            

            // 先移除舊的圖標
            if (originMarker) {
                map.removeLayer(originMarker);
                originMarker = null;
            }

            // 同時清空點擊產生的標記，讓畫面乾淨
            if (currentMarker) {
                map.removeLayer(currentMarker);
                currentMarker = null;
            }

            // 若照片有經緯度座標，則創建新圖標
            if (!isNaN(lat) && !isNaN(lng)) {
                document.getElementById('photo-lat').value = lat.toFixed(6);
                document.getElementById('photo-lng').value = lng.toFixed(6);

                originMarker = L.marker([lat, lng]).addTo(map)
                .bindPopup(`<b style="color: #666;">照片原始位置</b>`)
                .openPopup();

                map.setView([lat, lng], 16);
            } else {
                document.getElementById('photo-lat').value = '';
                document.getElementById('photo-lng').value = '';
            }

            });


        
        });
    });


