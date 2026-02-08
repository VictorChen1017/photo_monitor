<?php
// get_photo_proxy.php
$json_file = '../login/session_config.json';
$config = json_decode(file_get_contents($json_file), true);

// 外部傳入
$unitId = $_GET['unitId'];
$cache_key = $_GET['cache_key'] ?? $_GET['cacheKey'] ?? '';

// 1. 組合目標 URL
$nas_url = $config['nas_url'];
$token = $config['token'];
$target_url = "{$nas_url}/synofoto/api/v2/p/Thumbnail/get?id={$unitId}&cache_key=%22{$cache_key}%22&type=%22unit%22&size=%22xl%22&SynoToken={$token}";
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
$image_data = file_get_contents($target_url, false, $context);

// 4. 偽裝成圖片回傳給 JS
header("Content-Type: image/jpeg");
echo $image_data;