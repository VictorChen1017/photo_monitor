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
$type = $_GET['type'] ?? 'all'; // 可選：photo,geo, types, time_day,time_month,time_year, all
$result = [];


// 0. 總照片數與本月新增
if ($type == 'photo' || $type == 'all') {

    // 總數
    $res_total = $mysqli->query("SELECT COUNT(*) AS total FROM photos");
    $row_total = $res_total->fetch_assoc();
    $result['photo_total'] = (int)$row_total['total'];

    // 本月1日的時間戳（UNIX time）
    $first_day = strtotime(date("Y-m-01 00:00:00"));

    // 本月新增
    $res_month = $mysqli->query("SELECT COUNT(*) AS month_new FROM photos WHERE time >= $first_day");
    $row_month = $res_month->fetch_assoc();
    $result['photo_month_new'] = (int)$row_month['month_new'];
    $result['last_update_time'] = date("Y-m-d H:i:s");
}
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

// ⏱3. 時間分布統計（每日）
if ($type == 'time_day' || $type == 'all') {
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
    $result['time_day'] = $time;
}

// ⏱4. 時間分布統計（每月）

if ($type == 'time_month' || $type == 'all') {
    $time = [];
    $res = $mysqli->query("
        SELECT DATE_FORMAT(FROM_UNIXTIME(time), '%Y-%m') AS month, COUNT(*) AS count
        FROM photos 
        WHERE time >= UNIX_TIMESTAMP('2005-01-01')
         AND time <= UNIX_TIMESTAMP() 
         AND time IS NOT NULL
         AND time != 0
         AND time != -62169984000
         AND time != 2147483647
         AND time != 19700101
        GROUP BY month
        ORDER BY month ASC;
    ");
    while ($row = $res->fetch_assoc()) {
        $time[] = $row;
    }
    $result['time_month'] = $time;
}

// ⏱5. 時間分布統計（每年）
if ($type == 'time_year' || $type == 'all') {
    $time = [];
    $res = $mysqli->query("
        SELECT DATE_FORMAT(FROM_UNIXTIME(time), '%Y') AS year, COUNT(*) AS count
        FROM photos 
        WHERE time >= UNIX_TIMESTAMP('2005-01-01')
         AND time <= UNIX_TIMESTAMP() 
         AND time IS NOT NULL
         AND time != 0
         AND time != -62169984000
         AND time != 2147483647
         AND time != 19700101
        GROUP BY year
        ORDER BY year ASC
    ");
    while ($row = $res->fetch_assoc()) {
        $time[] = $row;
    }
    $result['time_year'] = $time;
}

header('Content-Type: application/json');
echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
$mysqli->close();

?>