// 2. 登錄邏輯 (複製自 login.html)

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("loginForm").addEventListener("submit", function(e) {
        e.preventDefault();
        const cookie_str = document.getElementById("cookie_str").value;
        const token = document.getElementById("token").value;

        document.getElementById("result").innerText = "正在驗證並同步照片資訊...";

        fetch("mainpage/request.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `cookie_str=${encodeURIComponent(cookie_str)}&token=${encodeURIComponent(token)}`
        })
        .then(response => response.text())
        .then(data => {
            //document.getElementById("result").innerHTML = `<span class="text-success">✅ ${data}</span>`;

            const resultDiv = document.getElementById("result");
                // 使用 HTML5 <details> 標籤達成原生摺疊效果
                resultDiv.innerHTML = `
                    <div class="alert alert-success mt-2">
                        <strong>✅ 登錄成功</strong>
                        <details class="mt-2">
                            <summary style="cursor: pointer; color: #666; font-size: 0.85rem;">
                                查看詳細執行日誌 (Logs)
                            </summary>
                            <div class="mt-2 p-2 bg-light border rounded" style="font-family: monospace; font-size: 0.8rem; white-space: pre-wrap;">
                                ${data}
                            </div>
                        </details>
                    </div>`;
            })
        })
        .catch(error => {
            document.getElementById("result").innerHTML = `<span class="text-danger">❌ 錯誤：${error}</span>`;
        });
    });
