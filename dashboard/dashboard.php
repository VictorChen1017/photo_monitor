<?php
header("Content-Type: text/html; charset=utf-8");

// 該檔案會進行資料庫的連結
// 執行時，回傳資料庫中的統計資料 包含有地理座標的相片數 檔案分類數量 以及時間分布 
// 採用單一php 加上傳輸參數的方式

// 資料庫連線
$mysqli = new mysqli("localhost", "root", "Chen1899", "photoexif"); // 修改帳密與DB名稱
if ($mysqli->connect_error) {
    echo "連線失敗\n" . htmlspecialchars("連線失敗: " . $mysqli->connect_error) . "</pre>";
}
//echo "✅ 資料庫連線成功！";

# 處理篩選的不同模式
$type = $_GET['type'] ?? 'all'; // 可選：geo, types, time, all
$result = [];

// 1. 含 GPS 的照片數
if ($type == 'geo' || $type == 'all') {
    $res = $mysqli->query("SELECT COUNT(*) AS count FROM photos WHERE gps_latitude IS NOT NULL AND gps_longitude IS NOT NULL");
    $row = $res->fetch_assoc();
    $result['geo_count'] = (int)$row['count'];
}

// 2. 檔案分類數量
if ($type == 'types' || $type == 'all') {
    $types = [];
    $res = $mysqli->query("SELECT type, COUNT(*) AS count FROM photos GROUP BY type");
    while ($row = $res->fetch_assoc()) {
        $types[$row['type']] = (int)$row['count'];
    }
    $result['types'] = $types;
}

// ⏱️ 3. 時間分布統計（每日）
if ($type == 'time' || $type == 'all') {
    $time = [];
    $res = $mysqli->query("
        SELECT FROM_UNIXTIME(time, '%Y-%m-%d') AS day, COUNT(*) AS count 
        FROM photos 
        WHERE time >= UNIX_TIMESTAMP('2005-01-01')
         AND time <= UNIX_TIMESTAMP() 
         AND time IS NOT NULL
         AND time != 0
         AND time != -62169984000
         AND time != 2147483647
         AND time != 19700101
        GROUP BY day 
        ORDER BY day ASC
    ");
    while ($row = $res->fetch_assoc()) {
        $time[] = $row;
    }
    $result['time'] = $time;
}

header('Content-Type: application/json');
echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
$mysqli->close();

?>