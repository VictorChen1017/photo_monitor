

// 所需套件：jQuery, Leaflet.js
document.addEventListener('DOMContentLoaded', function () { // 確保資源加載完畢

    $(document).ready(function() {

        // 指標圖 indicator1 照片總數
        
        fetch("login/update_log.json")  // 來自import.php的更新紀錄
        .then(res => res.json())
        .then(data => {
            Plotly.newPlot('indicator1', [{
            type: "indicator",
            mode: "number+delta",
            value: data.total, // 照片總數
            number: { // 格式設定
                valueformat: ",", // 加上千分位，避免出現 K
            },
            title: { text: "📸 照片總數" },
            delta: {
                reference: data.total-data.updated,
                increasing: { color: "green" },
                decreasing: { color: "red" }
            }
            }], {
            autosize: true,
            margin: { t: 20, b: 20, l: 20, r: 20 },
            responsive: true // 目前問題 無法響應式改變字體大小
            });

            document.getElementById("importResult").innerText =
            `上次更新時間：${data.last_update_time}`;
        })
        .catch(() => {
            document.getElementById("importResult").innerText = "尚未有更新紀錄。";
        });

        
        // 本月新增照片
        Plotly.newPlot('indicator2', [{
            type: "indicator",
            mode: "number",
            value: 120,
            title: { text: "本月新增" }
            }], { autosize: true, // 自動調整大小 以符合card範圍
            height: 150,  // 給一個適合卡片的高度
            margin: { t: 20, b: 20, l: 20, r: 20 }
            });

            
        // 可互動直條圖
        var months = ["1月", "2月", "3月", "4月", "5月"];
        var values = [500, 800, 600, 1000, 1200];

        Plotly.newPlot('barChart', [{
            x: months,
            y: values,
            type: "bar",
            marker: { color: "steelblue" }
            }], {
            title: "每月新增照片數",
            margin: { t: 50, b: 50 },
            xaxis: { title: "月份" },
            yaxis: { title: "照片數" }
            });





    });
});