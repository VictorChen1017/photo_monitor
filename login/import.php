<?php

//  環境變數

require_once __DIR__ . '/../vendor/autoload.php'; // 依據實際安裝位置而定
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

// $_ENV['DB_HOST'] 資料庫位置 這裡使用xampp mysql 預設localhost
// $_ENV['DB_USER'] 資料庫帳號 
// $_ENV['DB_PASS'] 資料庫密碼
// $_ENV['DB_NAME'] 資料庫名稱


//  DB 連線

$mysqli = new mysqli($_ENV['DB_HOST'], $_ENV['DB_USER'], $_ENV['DB_PASS'], $_ENV['DB_NAME']);

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
    (id, filename, filesize, time, indexed_time, owner_user_id, folder_id, type,
     gps_latitude, gps_longitude,
     country_id, city_id, district_id, village_id, route_id,cache_key,unit_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      filename=VALUES(filename),
      filesize=VALUES(filesize),
      time=VALUES(time),
      indexed_time=VALUES(indexed_time),
      owner_user_id=VALUES(owner_user_id),
      folder_id=VALUES(folder_id),
      type=VALUES(type),
      gps_latitude=VALUES(gps_latitude),
      gps_longitude=VALUES(gps_longitude),
      country_id=VALUES(country_id),
      city_id=VALUES(city_id),
      district_id=VALUES(district_id),
      village_id=VALUES(village_id),
      route_id=VALUES(route_id),
      cache_key = VALUES(cache_key),
      unit_id = VALUES(unit_id)
");

// 快速對比現有資料與資料庫，避免重複匯入同時確保同步


// === 建立資料庫現有 ID 清單（用於同步比對） ===
$db_ids = [];
$res = $mysqli->query("SELECT id FROM photos");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $db_ids[] = (int)$row['id'];
    }
}
$db_set = array_flip($db_ids); // 轉成哈希表方便查找

// === 2. 準備統計 ===
$new_count = 0;
$update_count = 0;



// === 3. 匯入 JSON ===
foreach ($data as $row) {
    $id = (int)$row['id'];

    $filename = $row['filename'];
    $filesize = $row['filesize'];
    $time = $row['time'];
    $indexed_time = $row['indexed_time'];
    $owner_user_id = $row['owner_user_id'];
    $folder_id = $row['folder_id'];
    $type = $row['type'];
    $gps_lat = $row['additional']['gps']['latitude'] ?? null;
    $gps_lng = $row['additional']['gps']['longitude'] ?? null;

    // Address ID 欄位
    $country_id = $row['additional']['address']['country_id'] ?? null;
    $city_id = $row['additional']['address']['city_id'] ?? null;
    $district_id = $row['additional']['address']['district_id'] ?? null;
    $village_id = $row['additional']['address']['village_id'] ?? null;
    $route_id = $row['additional']['address']['route_id'] ?? null;
    $cache_key = $row['additional']['thumbnail']['cache_key'];
    $unit_id  = $row['additional']['thumbnail']['unit_id'];

    // === 如果資料庫已有此 ID，先抓 DB 內容比對差異 ===
    $need_update = true;

    if (isset($db_set[$id])) {

        // 查詢資料庫資料
        // 未來優化可以只比對必要項目
        $check = $mysqli->prepare("SELECT filename, filesize, time, indexed_time, 
            owner_user_id, folder_id, type, gps_latitude, gps_longitude,
            country_id, city_id, district_id, village_id, route_id,cache_key,unit_id
            FROM photos WHERE id = ?");
        $check->bind_param("i", $id);
        $check->execute();
        $res = $check->get_result();

        if ($res && $res->num_rows > 0) {
            $db_row = $res->fetch_assoc();

            // 欄位逐一比對
            // 未來優化可以只比對必要項目
            $compare = [
                "filename"     => $filename,
                "filesize"     => $filesize,
                "time"         => $time,
                "indexed_time" => $indexed_time,
                "owner_user_id"=> $owner_user_id,
                "folder_id"    => $folder_id,
                "type"         => $type,
                "gps_latitude" => $gps_lat,
                "gps_longitude"=> $gps_lng,
                "country_id"   => $country_id,
                "city_id"      => $city_id,
                "district_id"  => $district_id,
                "village_id"   => $village_id,
                "route_id"     => $route_id,
                "cache_key"   => $cache_key,
                "unit_id" =>  $unit_id
            ];

            $need_update = false;

            foreach ($compare as $col => $val) {
                if ($db_row[$col] != $val) {
                    $need_update = true;
                    break;
                }
            }
        }

        // 如果完全沒有變化 → 不更新也不記 update_count
        if (!$need_update) {
            unset($db_set[$id]);
            continue;  
        }

        $update_count++;

    } else {
        // 此 ID 是新的
        $new_count++;
    }

    $stmt->bind_param(
        "isiiiiisddsssssss",
        $id, $filename, $filesize, $time, $indexed_time,
        $owner_user_id, $folder_id, $type, 
        $gps_lat, $gps_lng,
        $country_id, $city_id, $district_id, $village_id, $route_id,$cache_key,$unit_id 
    );
    $stmt->execute();

    // 匯入後從db_set移除，剩下的就是待刪除的
    unset($db_set[$id]);
}

// === 4. 刪除不在JSON的舊資料 ===
if (!empty($db_set)) {
    $ids_to_delete = implode(",", array_keys($db_set));
    $mysqli->query("DELETE FROM photos WHERE id IN ($ids_to_delete)");
}


//echo "✅ 匯入完成，目前共 " . count($data) . " 筆資料\n";
//echo "✅ 更新完成，本次更新 " . $updatedcount . " 筆資料\n";
$total = count($data);
//$message  = "✅ 匯入完成，目前共 {$total} 筆資料\n";
//$message .= "✅ 更新完成，本次更新 {$updatedcount} 筆資料\n";
date_default_timezone_set('Asia/Taipei');

// === 5. 寫入日誌 ===
$logData = [
    "status" => "success",
    "new" => $new_count,
    "updated" => $update_count,
    "deleted" => count($db_set),
    "total" => count($data),
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

