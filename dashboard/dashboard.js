

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
            title: { text: "📸 照片總數" , font: { size: 16 }},
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

        
        // 照片類型圓餅圖
        fetch("dashboard/dashboard.php")
        .then(response => response.json())
        .then(data => {
            const types = data.types;

            const labels = Object.keys(types);
            const values = Object.values(types);

            const pieData = [{
            values: values,
            labels: labels,
            type: 'pie',
            hole: 0.45,
            //textinfo: 'label+percent',
            hoverinfo: 'label+value+percent',
            marker: { line: { color: '#fff', width: 2 } }
            }];

            const layout = {
            title: { text: '檔案類型分布', font: { size: 16 } },
            margin: { t: 40, b: 10, l: 10, r: 10 }, // 收緊邊界讓圖剛好放入卡片
            height: 250,
            width: 250,
            showlegend: true,
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            };

            Plotly.newPlot('indicator2', pieData, layout, { displayModeBar: false });
        })
        .catch(error => console.error('Error fetching data:', error));

        //有定位的照片數量
        fetch("dashboard/dashboard.php")  // 來自import.php的更新紀錄
        .then(res => res.json())
        .then(data => {
            Plotly.newPlot('indicator3', [{
            type: "indicator",
            mode: "number",
            value: data.geo_count, // 照片總數
            number: { // 格式設定
                valueformat: ",", // 加上千分位，避免出現 K
            },
            title: { text: "🌍 定位的照片數量" , font: { size: 16 }},
            }], {
            autosize: true,
            margin: { t: 20, b: 20, l: 20, r: 20 },
            responsive: true // 目前問題 無法響應式改變字體大小
            });

        })
        .catch(() => {
            document.getElementById("importResult").innerText = "尚未有更新紀錄。";
        });




        // 每日資料筆數分布圖

        fetch("dashboard/dashboard.php")
        .then(response => response.json())
        .then(data => {


        const timeData = data.time || []; // 確保不報錯

        // 取出日期與數值
        const days = timeData.map(item => item.day);
        const counts = timeData.map(item => parseInt(item.count));

        // 建立直條圖 trace
        const trace = {
        x: days,
        y: counts,
        type: 'bar',
        marker: { color: '#9A3033' },
        hoverinfo: 'x+y',
        };

        //預設顯示6個月
        // 找出日期範圍
        const maxDate = new Date(Math.max(...days.map(d => new Date(d))));
        const minDate = new Date(maxDate);
        minDate.setMonth(minDate.getMonth() - 6); // ← 這裡設定預設為6個月區間

        // Layout 設定
        const layout = {
        title: { text: '每日資料筆數分布', font: { size: 16 } },
        xaxis: {
            title: '日期',
            type: 'date',
            range: [minDate.toISOString().split('T')[0], maxDate.toISOString().split('T')[0]], // ✅ 預設為6M區間
            rangeslider: { visible: true },  // 加入滑動條
            rangeselector: {
            buttons: [
                { count: 7, label: '1w', step: 'day', stepmode: 'backward' },
                { count: 1, label: '1m', step: 'month', stepmode: 'backward' },
                { count: 6, label: '6m', step: 'month', stepmode: 'backward' },
                { count: 1, label: '1y', step: 'year', stepmode: 'backward' },
                { step: 'all', label: '全部' }
            ]
            }
        },
        yaxis: { title: '筆數 (count)' },
        margin: { t: 40, b: 50, l: 50, r: 20 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        height: 250
        };

        // 在 card 中繪製
        Plotly.newPlot('barChart', [trace], layout, { displayModeBar: false });
    })
    .catch(error => console.error('Error fetching data:', error));



    });
});