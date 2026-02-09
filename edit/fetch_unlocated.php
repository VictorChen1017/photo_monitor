<?php
// fetch_unlocated.php
header("Content-Type: application/json; charset=utf-8");

date_default_timezone_set('Asia/Taipei');

$mysqli = new mysqli("localhost", "root", "Chen1899", "photoexif");
if ($mysqli->connect_error) {
    die(json_encode(["error" => "連線失敗"]));
}

// 1. 設定搜尋條件：涵蓋起訖點、地點有無、媒體種類
$start_date = $_GET['start'] ?? '2002-01-01'; // 時間更改
$end_date = $_GET['end'] ?? date("Y-m-d");
$location_filter = $_GET['location'] ?? 'all'; // all, none, exist
$type_filter = $_GET['type'] ?? 'all';         // all, photo, video, live

// 將日期轉換為 10 位數 Unix Timestamp (秒)
$start_ts = strtotime($start_date . " 00:00:00");
$end_ts = strtotime($end_date . " 23:59:59");


//2. 動態拚接sql

// 基礎 SQL
$sql = "SELECT id, filename, time, cache_key, unit_id, type FROM photos 
        WHERE time >= ? AND time <= ? AND time > 0";

// 地點篩選邏輯
if ($location_filter === 'none') {
    $sql .= " AND (gps_latitude IS NULL OR gps_longitude IS NULL OR gps_latitude = 0 OR gps_longitude = 0)";
} elseif ($location_filter === 'exist') {
    $sql .= " AND (gps_latitude IS NOT NULL AND gps_longitude IS NOT NULL AND gps_latitude != 0 AND gps_longitude != 0)";
}

// 檔案類型篩選
if ($type_filter !== 'all') {
    $sql .= " AND type = ?";
}

$sql .= " ORDER BY time DESC";

// 3. sql搜尋執行階段

$stmt = $mysqli->prepare($sql);

if ($type_filter !== 'all') {
    $stmt->bind_param("iis", $start_ts, $end_ts, $type_filter);
} else {
    $stmt->bind_param("ii", $start_ts, $end_ts);
}

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