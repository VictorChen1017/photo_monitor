// 確保 Leaflet 與 jQuery 已載入
document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('filter-container');

    // 1. 增加「地點狀態」與「檔案類型」篩選器
        container.innerHTML = `
            <div class="card p-4 shadow-sm">
                <h5>📸 照片進階篩選與編輯</h5>
                <div class="row g-3">
                    <div class="col-sm-12 col-md-3">
                        <label class="form-label small">開始日期</label>
                        <input type="date" id="filter-start" class="form-control" value="2026-01-01">
                    </div>
                    <div class="col-sm-12 col-md-3">
                        <label class="form-label small">結束日期</label>
                        <input type="date" id="filter-end" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="col-sm-12 col-md-3">
                        <label class="form-label small">地點狀態</label>
                        <select id="filter-location" class="form-select">
                            <option value="all">全部 (包含有/無座標)</option>
                            <option value="none" selected>僅顯示無座標</option>
                            <option value="exist">僅顯示已有座標</option>
                        </select>
                    </div>
                    <div class="col-sm-12 col-md-3">
                        <label class="form-label small">檔案類型</label>
                        <select id="filter-type" class="form-select">
                            <option value="all">全部類型</option>
                            <option value="photo">照片 (Photo)</option>
                            <option value="video">影片 (Video)</option>
                            <option value="live">原況照片 (Live)</option>
                        </select>
                    </div>
                    <div class="col-sm-12 col-md-12 d-flex justify-content-end">
                        <button id="btn-search" class="btn btn-primary px-5">
                            <i class="fas fa-search me-1"></i> 執行搜尋
                        </button>
                    </div>
                </div>
                <div id="result-status" class="small mt-3 mb-2 text-secondary font-italic">
                    <i class="fas fa-info-circle me-1"></i> 請設定條件並點擊搜尋
                </div>
                <select id="photo-selector" class="form-select" size="10">
                    <option value="" disabled>-- 尚未搜尋 --</option>
                </select>

                <div id="photo-container" class="card shadow-sm">

                        <div class="card-header bg-light py-2 d-flex justify-content-between align-items-center">

                        </div>

                        <div class="card-body d-flex justify-content-center align-items-center" style="min-height: 400px; background: #fdfdfd;">

                            <div id="preview-placeholder" class="text-center text-muted">

                                <i class="fas fa-image fa-3x mb-2"></i><br>請從上方清單選擇照片

                            </div>

                        </div>

                    </div>
                </div>
        `;
    const selector = document.getElementById('photo-selector');
    const btnSearch = document.getElementById('btn-search');
    const statusText = document.getElementById('result-status');

    // 2. 搜尋功能
    btnSearch.addEventListener('click', function() {
        const start = document.getElementById('filter-start').value;
        const end = document.getElementById('filter-end').value;
        const location = document.getElementById('filter-location').value;
        const type = document.getElementById('filter-type').value

        statusText.innerText = "查詢中...";
        selector.innerHTML = '<option value="">載入中...</option>';

        // 串接新的篩選參數
        const url = `./edit/fetch_unlocated.php?start=${start}&end=${end}&location=${location}&type=${type}`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                selector.innerHTML = ''; // 清空
                if (data.length === 0) {
                    statusText.innerText = "找不到符合條件的照片。";
                    selector.innerHTML = '<option value="">無符合資料</option>';
                    return;
                }

                statusText.innerText = `找到 ${data.length} 張符合條件的照片`;
                data.forEach(photo => {
                    const opt = document.createElement('option');
                    opt.value = photo.unit_id;

                    // 選取資料時間
                    opt.time = photo.time;

                    const date = new Date(parseInt(opt.time) * 1000);
                    const dateString = date.toISOString().slice(0, 16);
    
                    opt.text = `[${dateString}] ${photo.filename}`;

                    // 儲存地理資訊
                    opt.dataset.lat = photo.gps_latitude; 
                    opt.dataset.lng = photo.gps_longitude;
                    
                    // 儲存路徑資訊供 API 使用 (假設你資料庫有存 path)
                    opt.filename = photo.filename
                    opt.dataset.cache_key = photo.cache_key;
                    
                    selector.appendChild(opt);
                });
            })
            .catch(err => {
                statusText.innerText = "查詢發生錯誤。";
                console.error(err);
            });
    });

    // 處理登入
    let NAS_CONFIG = {
        sid: null,
        url: null
    };

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

    // 外部宣告計時器變數，用於防抖設計，確保它在多次事件觸發間能被共享
    let photoDebounceTimer = null;

    document.getElementById('photo-selector').addEventListener('change', function() {

        // 選單切換時，清除上一次設定的計時器
        clearTimeout(photoDebounceTimer);


        const selectedOption = this.options[this.selectedIndex];
        const unitId = selectedOption.value;
        const cache_key = selectedOption.dataset.cache_key;
        const previewBody = document.querySelector('#photo-container .card-body');

        console.log(unitId);
        console.log(cache_key);
        
        // 設定新計時器，延遲執行載入邏輯
        photoDebounceTimer = setTimeout(() => {

            // 顯示讀取中...
            previewBody.innerHTML = '<div class="spinner-border text-danger" role="status"></div>';

            // 呼叫 PHP 代理，並傳入 unitId 與 cacheKey
            const size = 'm' // 影像大小
            
            const proxyUrl = `./edit/get_photo_proxy.php?unitId=${unitId}&cacheKey=${cache_key}&size=${size}`;
            //const absoluteUrl = new URL(proxyUrl, window.location.href).href;
            //console.log("絕對 URL:", absoluteUrl);

            const img = new Image();
            img.className = "img-fluid shadow-sm rounded";
            img.style.maxHeight = "400px";
            
            img.onload = () => {
                previewBody.innerHTML = '';
                previewBody.appendChild(img);
            };
            
            img.onerror = () => {
                previewBody.innerHTML = '<div class="text-danger small">後端代理抓取失敗，請檢查 NAS 連線</div>';
            };

            img.src = proxyUrl;


        }, 250); // 建議設定在 250~350ms 之間，這是在流暢度與效能間的最佳平衡
        
        
    });

});