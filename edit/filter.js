// 確保 Leaflet 與 jQuery 已載入
document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('filter-container');

    // 1. 建立簡易介面 HTML
    container.innerHTML = `
        <div class="card p-4 shadow-sm">
                    <h5>📸 無座標照片篩選</h5>
                    <div class="row g-3">
                        <div class="col-sm-12 col-md-5">
                            <label class="form-label small">開始日期</label>
                            <input type="date" id="filter-start" class="form-control" value="2026-01-01">
                        </div>
                        <div class="col-sm-12 col-md-5">
                            <label class="form-label small">結束日期</label>
                            <input type="date" id="filter-end" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="col-sm-12 col-md-2 d-flex align-items-end">
                            <button id="btn-search" class="btn btn-primary w-100">
                                <i class="fas fa-search me-1"></i> 搜尋
                            </button>
                        </div>
                    </div>
                    <div id="result-status" class="small mt-3 mb-2 text-secondary font-italic">
                        <i class="fas fa-info-circle me-1"></i> 請設定日期並點擊搜尋
                    </div>
                    <select id="photo-selector" class="form-select" size="10">
                        <option value="" disabled>-- 尚未搜尋 --</option>
                    </select>

                    <div id="photo-container" class="card shadow-sm">
                        <div class="card-header bg-light py-2 d-flex justify-content-between align-items-center">
                            <span id="photo-info" class="small text-primary fw-bold">尚未選取照片</span>
                            <span class="badge bg-secondary">預覽視窗</span>
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

        statusText.innerText = "查詢中...";
        selector.innerHTML = '<option value="">載入中...</option>';

        fetch(`./edit/fetch_unlocated.php?start=${start}&end=${end}`)
            .then(res => res.json())
            .then(data => {
                selector.innerHTML = ''; // 清空
                if (data.length === 0) {
                    statusText.innerText = "此區間無遺漏座標的照片。";
                    selector.innerHTML = '<option value="">無符合資料</option>';
                    return;
                }

                statusText.innerText = `找到 ${data.length} 張未定位照片`;
                data.forEach(photo => {
                    const opt = document.createElement('option');
                    opt.value = photo.unit_id;
                    opt.text = `[${photo.formatted_date}] ${photo.filename}`;
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

    document.getElementById('photo-selector').addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    const unitId = selectedOption.value;
    const cache_key = selectedOption.dataset.cache_key;

    console.log(unitId);
    console.log(cache_key);
    
    const previewBody = document.querySelector('#photo-container .card-body');
    
    // 顯示讀取中...
    previewBody.innerHTML = '<div class="spinner-border text-danger" role="status"></div>';

    // 呼叫 PHP 代理，並傳入 unitId 與 cacheKey
    const proxyUrl = `./edit/get_photo_proxy.php?unitId=${unitId}&cacheKey=${cache_key}`;
    
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
});

});