
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

        // 連線嘗試(用於縮圖)

         // 頁面載入時初始化連線資訊
        async function initSession() {
            try {
                const res = await fetch('./edit/edit_login.php');
                const data = await res.json();
                if (data.sid && data.nas_url) {
                    NAS_CONFIG.token = data.token; // 對應id 
                    NAS_CONFIG.url = data.nas_url;
                    console.log("✅ 已載入 Session 資訊");
                }
            } catch (err) {
                console.error("無法載入 Session 設定:", err);
            }
        }
            // 執行初始化
        initSession();


        // 圖層控制
        var heatLayer; 
        var pointboxLayer; // 優化的點圖層
        

        // 定位

        document.getElementById("loc-toggle").addEventListener("click", function() {

            map.locate({ setView: true, maxZoom: 16 });
            map.on('locationerror', function(e) {
                alert("無法取得定位：" + e.message);
            });

            map.on('locationfound', function (e) {
                L.marker(e.latlng).addTo(map)
                .bindPopup("你在這裡").openPopup();
                handleMapClick(e.latlng.lat, e.latlng.lng);
            });

            
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

        // 加入函式 照片預覽



        function getPhotoPreviewUrl(unitId, cacheKey, size = 'sm') {
            return new Promise((resolve, reject) => {
                const proxyUrl = `./edit/get_photo_proxy.php?unitId=${unitId}&cacheKey=${cacheKey}&size=${size}`;
                
                const img = new Image();
                // 預載圖片以確保寬高正確
                img.onload = () => resolve(proxyUrl);
                img.onerror = () => reject(new Error("NAS 連線失敗"));
                
                img.src = proxyUrl;
            });
        }

        


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

                        

                        // 🔹 改為滑鼠事件動態生成標籤

                        // 1. 定義預覽窗格的 HTML (包含 CSS 樣式控制大小)


      

                        marker.on("mouseover", async function(e) {


                            // html

                            // 原始的標籤

                            const tooltipHtml = `📸 ID: ${d.id}<br>🕒 ${d.time}`;

                            // 先顯示載入中的 Tooltip (避免畫面沒反應)
                            const initialContent = `
                                <div class="photo-tooltip-container">
                                    <div class="photo-preview-box d-flex justify-content-center">
                                        <div class="spinner-border text-danger spinner-border-sm" role="status"></div>
                                    </div>
                                    <div class="photo-info">${tooltipHtml}</div>
                                </div>
                            `;

                        
                            // 一開始用initialContent 等待相片載入

                            const tooltip = L.tooltip({
                                direction: "top",
                                offset: [0, -10], // 往上偏移一點，避免擋住 Marker
                                opacity: 1.0,
                                className: "photo-tooltip"
                            })
                            .setContent(initialContent) //.setContent(tooltipHtml)
    
                            .setLatLng(e.latlng)
                            .addTo(map);
                            marker._tempTooltip = tooltip; // 暫存 tooltip 參考

                            // 若照片載好

                            try { // 2. 呼叫封裝好的函式，等待圖片載入
                            // const imageUrl = await getPhotoPreviewUrl(photo.id, photo.cache_key);
                            const imageUrl = await getPhotoPreviewUrl(d.unit_id, d.cache_key);
                            

                            // 3. 檢查使用者滑鼠是否還在上面（避免滑走了才更新）
                            if (marker._tempTooltip && map.hasLayer(marker._tempTooltip)) {
                                const finalHtml = `
                                    <div class="photo-tooltip-container">
                                        <div class="photo-preview-box">
                                            <img src="${imageUrl}" class="img-fluid shadow-sm rounded" 
                                                style="width: 150px; height: auto; display: block; margin-bottom: 5px;">
                                        </div>
                                        <div class="photo-info">${tooltipHtml}</div>
                                    </div>
                                `;
                                marker._tempTooltip.setContent(finalHtml);
                            }} catch (err) {
                                if (marker._tempTooltip) {
                                    marker._tempTooltip.setContent(`<div class="text-danger small">無法載入預覽</div>${tooltipHtml}`);
                                }
                            }



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


        // 加入繪圖功能 預留html按鈕

        // 1. 初始化變數
        let isSelectionMode = false; // 控制選取模式
        let startLatLng, tempRectangle;
        let buttonswitch = false;

        // 定義函數 控制矩形跟著滑鼠跑
    

        // 2. 建立 UI 按鈕 (這部分可以用 HTML 按鈕代替)
        const toggleBtn = document.getElementById('draw-toggle');

        // 2. 使用監聽器 控制按鈕的外觀 以及isSelectionMode的狀態
        toggleBtn.addEventListener("click", function() {

            // 切換布林值狀態 僅從false 改成true
            if (!isSelectionMode){
                isSelectionMode = true;
            }

            // 切換
            buttonswitch  = !buttonswitch ; 


            console.log("buttonswitch :",buttonswitch );

            // 判斷按鈕切換

             if (buttonswitch) {

                // 切換按鈕的 CSS 類別與文字
                // 按鈕激活
                this.classList.toggle("active");
                this.innerText = "停止選取";

                map.dragging.disable(); // 鎖定地圖不讓它飄移
                map.getContainer().style.cursor = 'crosshair'; // 鼠標變十字

             }else {

                // 按鈕滅活
                this.classList.remove("active");
                this.innerText = "框選照片";

                // 清除多餘多邊形
                if (tempRectangle) {
                    map.removeLayer(tempRectangle); // 1. 先從地圖移除（畫面消失）
                    tempRectangle = null;           // 2. 再清空變數（釋放記憶體）
                }

                // 按鈕回復原狀
                map.getContainer().style.cursor = '';

             }



            

            if (isSelectionMode) {
                // --- 進入選取模式 ---

                console.log("SelectionMode: ",isSelectionMode);
    
                
                
            } else {

                console.log("SelectionMode: ",isSelectionMode);
                // --- 結束選取模式 ---
                map.dragging.enable(); 
                map.getContainer().style.cursor = '';

                // *** 關鍵：如果已有矩形，先移除它 ***
                
                //map.removeLayer(tempRectangle);
                //console.log("tempRectangle removed ");
                
                
                
                // 如果關閉模式時想清除地圖上的矩形，取消下方註解：
                //if (tempRectangle) { map.removeLayer(tempRectangle); tempRectangle = null; }
            }
        });

        // 3. 繪圖滑鼠事件 (只有在 isSelectionMode 為 true 時生效)
        map.on('mousedown', (e) => {
            if (!isSelectionMode || !buttonswitch) return;

            console.log("mousedown");

            
            
            // 如果畫新矩形前要刪除舊的，可以在這加入 map.removeLayer(tempRectangle)
            startLatLng = e.latlng;
            tempRectangle = L.rectangle([startLatLng, startLatLng], {
                color: "#3388ff",
                weight: 1,
                fillOpacity: 0.2,
                dashArray: '5, 5' // 虛線感
            }).addTo(map);
        });

        map.on('mousemove', (e) => {
            if (!isSelectionMode || !tempRectangle || !buttonswitch) return;
            tempRectangle.setBounds(L.latLngBounds(startLatLng, e.latlng));
        });

        map.on('mouseup', (e) => {

            console.log("mouseup");

            // 控制按鈕
            toggleBtn.innerText = "送出篩選";
            

            if (!isSelectionMode || !tempRectangle || !buttonswitch) return;
            
            // 獲取最終範圍 (供之後篩選照片點位使用)
            const finalBounds = tempRectangle.getBounds();

            console.log("選取完成，座標範圍：", finalBounds);


            // finalBounds 將作為搜尋條件 目前功能尚未實現
            // 搜尋請求預留

            

            // 將虛線 (dashArray) 移除，並加深透明度，讓它看起來是「已確定的範圍」
            tempRectangle.setStyle({
                dashArray: null,    // 變回實線
                weight: 2,          // 實線寬度
                fillOpacity: 0.2    // 稍微加深填充
            });
                

            // 滑鼠放開後 將true 改成 false
            if (isSelectionMode){
                isSelectionMode = false;
            }

            console.log("SelectionMode: ",isSelectionMode);

            

            console.log(tempRectangle)
            //tempRectangle = null

            

            

            
        });





    });



});