<?php
// fetch_unlocated.php
header("Content-Type: application/json; charset=utf-8");

date_default_timezone_set('Asia/Taipei');

$mysqli = new mysqli("localhost", "root", "Chen1899", "photoexif");
if ($mysqli->connect_error) {
    die(json_encode(["error" => "連線失敗"]));
}

$start_date = $_GET['start'] ?? '2002-01-01'; // 時間更改
$end_date = $_GET['end'] ?? date("Y-m-d");

// 將日期轉換為 10 位數 Unix Timestamp (秒)
$start_ts = strtotime($start_date . " 00:00:00");
$end_ts = strtotime($end_date . " 23:59:59");

// 修正 SQL 語句
// 關鍵：除了檢查 NULL，還要檢查經緯度是否為 0 (匯入工具常見的預設值)
// 同時排除掉 dashboard.php 中提到的異常時間數值
$sql = "SELECT id, filename, time, cache_key, unit_id FROM photos 
        WHERE time >= ? AND time <= ? 
        AND (
            gps_latitude IS NULL OR 
            gps_longitude IS NULL OR 
            gps_latitude = 0 OR 
            gps_longitude = 0
        )
        AND time > 0 
        ORDER BY time DESC";

$stmt = $mysqli->prepare($sql);
$stmt->bind_param("ii", $start_ts, $end_ts);
$stmt->execute();
$res = $stmt->get_result();

$photos = [];
while ($row = $res->fetch_assoc()) {
    // 格式化時間方便前端顯示
    $row['formatted_date'] = date("Y-m-d H:i", $row['time']);
    $photos[] = $row;
}

echo json_encode($photos);
$mysqli->close();
?>