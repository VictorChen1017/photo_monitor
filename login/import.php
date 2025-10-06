<?php
// DB 連線
$mysqli = new mysqli("localhost", "root", "Chen1899", "photoexif"); // 修改帳密與DB名稱
if ($mysqli->connect_error) {
    echo "連線失敗\n" . htmlspecialchars("連線失敗: " . $mysqli->connect_error) . "</pre>";
}
//echo "✅ 資料庫連線成功！";

// 讀取 JSON 檔
$jsonFile = __DIR__ . "/all_items.json"; // 你的JSON檔名
$data = json_decode(file_get_contents($jsonFile), true);

if (!$data) {
    die("讀取 JSON 失敗");
}

// 預備語法 避免SQL Injection
$stmt = $mysqli->prepare("
    INSERT INTO photos 
    (id, filename, filesize, time, indexed_time, owner_user_id, folder_id, type, gps_latitude, gps_longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      filename=VALUES(filename),
      filesize=VALUES(filesize),
      time=VALUES(time),
      indexed_time=VALUES(indexed_time),
      owner_user_id=VALUES(owner_user_id),
      folder_id=VALUES(folder_id),
      type=VALUES(type),
      gps_latitude=VALUES(gps_latitude),
      gps_longitude=VALUES(gps_longitude)
");

//找出目前最大ID，避免重複匯入
$result = $mysqli->query("SELECT MAX(id) as last_id FROM photos");
$row = $result->fetch_assoc();
$last_id = $row['last_id'] ?? 0;
$updatedcount = 0; // 計數更新數量

// 匯入資料
foreach ($data as $row) {

    if ($row['id'] <= $last_id) {
        continue; // 跳過已存在的
    }
    $updatedcount++;
    $id = $row['id'];
    $filename = $row['filename'];
    $filesize = $row['filesize'];
    $time = $row['time'];
    $indexed_time = $row['indexed_time'];
    $owner_user_id = $row['owner_user_id'];
    $folder_id = $row['folder_id'];
    $type = $row['type'];

    // 解析 gps
    // NULL可以接受
    $gps_lat = isset($row['additional']['gps']['latitude']) ? $row['additional']['gps']['latitude'] : null;
    $gps_lng = isset($row['additional']['gps']['longitude']) ? $row['additional']['gps']['longitude'] : null;

    // 保留完整 additional
    //$additional = json_encode($row['additional'], JSON_UNESCAPED_UNICODE);

    $stmt->bind_param( // 將資料套進去預設的SQL格式，取代???
        "isiiiiisds", //每行資料型態
        $id, $filename, $filesize, $time, $indexed_time,
        $owner_user_id, $folder_id, $type,
        $gps_lat, $gps_lng
    );
    $stmt->execute();
}

//echo "✅ 匯入完成，目前共 " . count($data) . " 筆資料\n";
//echo "✅ 更新完成，本次更新 " . $updatedcount . " 筆資料\n";
$total = count($data);
//$message  = "✅ 匯入完成，目前共 {$total} 筆資料\n";
//$message .= "✅ 更新完成，本次更新 {$updatedcount} 筆資料\n";
date_default_timezone_set('Asia/Taipei');
// 建立更新資訊
$logData = [
    "status"           => "success",
    "total"            => count($data),
    "updated"          => $updatedcount,
    "last_update_time" => date("Y-m-d H:i:s")
];

// === 寫入紀錄檔 ===
$logFile = __DIR__ . "/update_log.json";
if (file_exists($logFile)) {
    unlink($logFile); // 先刪除舊檔
}
file_put_contents($logFile, json_encode($logData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

// === 回傳給前端 ===
echo json_encode($logData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

//關閉資料庫

$stmt->close();
$mysqli->close();
?>

