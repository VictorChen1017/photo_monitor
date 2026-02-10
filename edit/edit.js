
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



        // 處理點擊編輯地理位置

        

        map.on('click', function(e) {
            document.getElementById('edit-lat').value = e.latlng.lat.toFixed(6);
            document.getElementById('edit-lng').value = e.latlng.lng.toFixed(6);

            // 2. 判斷是否已經有舊圖標，有的話就移除
            if (currentMarker) {
                map.removeLayer(currentMarker);
            }
            

            var greenIcon = new L.Icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });
            // 3. 建立新圖標並加到地圖上
                // 你可以自訂 Marker 的顏色或使用預設
            currentMarker = L.marker(e.latlng, { icon: greenIcon }).addTo(map)
                .bindPopup(`<b>新位置</b>`)
                .openPopup();
            });

        // 處理切換選單時更新照片地理位置
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


            // 處理提交資料
            document.getElementById('saveBtn').addEventListener('click', function() {

                // 連結photo-selector的結果(獲取unid_id、若有需要添加cache_key)
                const selector = document.getElementById('photo-selector');
                const selectedOpt = selector.options[selector.selectedIndex];

            // 取得各個欄位的數值
                const photoLat = document.getElementById('photo-lat').value; // 原始座標
                const photoLng = document.getElementById('photo-lng').value;
                const editLat = document.getElementById('edit-lat').value;   // 編輯後新座標
                const editLng = document.getElementById('edit-lng').value;
                const editTime = document.getElementById('edit-time').value;

            // 建立傳輸物件
                const updateData = {
                    unit_id: selectedOpt.value,
                    // 如果有新座標就用新的，否則維持原始座標
                    lat: editLat || photoLat, // JS語法若左邊有值優先取左，若無則取右
                    lng: editLng || photoLng,
                    time: editTime
                };

                // 檢查資訊是否缺失
                console.log(updateData)

                // 邏輯檢查

                // 拍攝時間(不太可能沒有)
                if (!updateData.time) {
                    alert("請確認拍攝時間！");
                    return;
                }

                // 檢查座標 (如果原始與編輯後皆為空，代表這張照片完全沒有地理資訊)
                // 這裡您可以根據需求決定：是否允許完全沒有座標的照片儲存 (僅改時間)
                if (!updateData.lat || !updateData.lng) {
                    const confirmSave = confirm("偵測到經緯度資訊缺失，您確定僅更新拍攝時間嗎？");
                    if (!confirmSave) return;
                }

                // 執行傳輸
                fetch('./edit/update_photo_info.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData)
                })
                .then(res => res.json())
                .then(result => {
                    if(result.status === 'success') {
                        alert("✅ 儲存成功！已更新資料庫資訊。");
                        // 可在此重新整理列表或更新介面狀態
                    } else {
                        alert("❌ 儲存失敗：" + result.message);
                    }
                })
                .catch(err => console.error("傳輸錯誤:", err));

            });


        
        });
    });


