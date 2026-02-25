document.addEventListener("DOMContentLoaded", function() {
    function startDatabaseUpdate() {
    const resultElement = document.getElementById("link_result");
    const importElement = document.getElementById("importResult");

    resultElement.innerText = "連接NAS狀態：正在執行 Python 抓取 (request.php)...";
    importElement.innerText = "同步資料庫狀態：等待中 大約需要等候十幾秒...";

    // 1. 先執行 request.php (抓取資料)
    fetch("mainpage/login_request.php", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" }
    })
    .then(response => {
        if (!response.ok) throw new Error("Request.php 執行失敗");
        return response.text();
    })
    .then(data => {
        // 顯示第一個腳本的輸出
        resultElement.innerText = data;
        
        // 2. 確認成功後，接著執行 import.php (匯入資料)
        importElement.innerText = "Python 執行成功，正在匯入資料庫 (import.php)...";
        
        return fetch("mainpage/login_import.php", { method: "POST" });
    })
    .then(response => {
        if (!response.ok) throw new Error("Import.php 執行失敗");
        return response.json();
    })
    .then(data => {
        // 3. 顯示最終匯入結果
        importElement.innerText = 
            `✅ 匯入完成，目前共 ${data.total} 筆資料\n` +
            `✅ 更新完成，本次更新 ${data.new} 筆資料\n` +
            `✅ 刪除 ${data.deleted} 筆資料\n` +
            `🕒 最後更新時間 ${data.last_update_time}`;

        window.importStats = {
            total: data.total,
            updated: data.new
        };
        console.log("儀表板用變數：", window.importStats);
    })
    .catch(error => {
        // 捕捉流程中任何一個環節的錯誤
        console.error("流程發生錯誤:", error);
        importElement.innerText = "❌ 執行中斷：" + error.message;
    });
}

document.getElementById("importBtn").addEventListener("click", function() {
    document.getElementById("importResult").innerText = "正在匯入資料庫，請稍候...";

    // 點擊資料庫後的處理邏輯
    startDatabaseUpdate()

});

 });