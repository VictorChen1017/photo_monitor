<?php

// 環境變數
require_once __DIR__ . '/../vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

// 資料庫連線
$mysqli = new mysqli($_ENV['DB_HOST'], $_ENV['DB_USER'], $_ENV['DB_PASS'], $_ENV['DB_NAME']);

if ($mysqli->connect_error) {
    echo json_encode([
        "status" => "error",
        "message" => "資料庫連線失敗: " . $mysqli->connect_error
    ]);
    exit;
}

// 設定時區
date_default_timezone_set('Asia/Taipei');

// === 查詢前10筆資料 ===
$query = "SELECT id, city_id, district_id, village_id, route_id FROM photos LIMIT 10";
$result = $mysqli->query($query);

if (!$result) {
    echo json_encode([
        "status" => "error",
        "message" => "查詢失敗: " . $mysqli->error
    ]);
    exit;
}

// === 組裝結果 ===
$data = [];
while ($row = $result->fetch_assoc()) {
    $data[] = [
        "id" => $row['id'],
        "city_id" => $row['city_id'],
        "district_id" => $row['district_id'],
        "village_id" => $row['village_id'],
        "route_id" => $row['route_id']
    ];
}

// === 回傳結果 ===
$response = [
    "status" => "success",
    "count" => count($data),
    "data" => $data,
    "timestamp" => date("Y-m-d H:i:s")
];

echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

// 關閉連線
$mysqli->close();
?>