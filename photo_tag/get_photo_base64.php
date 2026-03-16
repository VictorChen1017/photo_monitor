<?php


// 從session_config記錄檔讀取登錄資訊，並向nas發送請求，取得照片縮圖
// 轉成base64編碼 發送給ai大模型
// 預計回傳資料：文字字串 形容圖片的文句
// 將id、文句 匯入資料庫(新增)


$json_file = '../mainpage/session_config.json'; 
$config = json_decode(file_get_contents($json_file), true);

// 外部傳入
$unitId = $_GET['unitId'];
$cache_key = $_GET['cache_key'] ?? $_GET['cacheKey'] ?? '';
$size = $_GET['size'] ?? 'm'; // 影像大小，預設為m 其他選項：sm m x1 original

// 1. 組合目標 URL
$nas_url = $config['nas_url'];
$token = $config['token'];
//$target_url = "{$nas_url}/synofoto/api/v2/p/Thumbnail/get?id={$unitId}&cache_key=%22{$cache_key}%22&type=%22unit%22&size=%22xl%22&SynoToken={$token}";
$target_url = "{$nas_url}/synofoto/api/v2/p/Thumbnail/get?id={$unitId}&cache_key=%22{$cache_key}%22&type=%22unit%22&size=${size}&SynoToken={$token}";
error_log("Debug NAS URL: " . $target_url);
// 2. 組合 Cookie 字串 (這就是手動成功關鍵)
$cookie_str = "";
foreach ($config['cookies'] as $name => $value) {
    $cookie_str .= "$name=$value; ";
}

// 3. 使用後端發送請求
$options = [
    "http" => [
        "header" => "Cookie: " . rtrim($cookie_str, "; ") . "\r\n",
        "method" => "GET",
        "follow_location" => 1 // 處理 307 跳轉
    ],
    "ssl" => ["verify_peer" => false, "verify_peer_name" => false]
];

$context = stream_context_create($options);
$image_data = file_get_contents($target_url, false, $context); // 照片資料


echo $image_data; //debug

?>