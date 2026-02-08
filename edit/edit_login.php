<?php
// get_sid.php
header("Content-Type: application/json; charset=utf-8");

$json_file = '../login/session_config.json';

if (file_exists($json_file)) {
    $json_data = json_decode(file_get_contents($json_file), true);
    
    // 提取我們需要的資訊
    $config = [
        "sid" => $json_data['cookies']['id'] ?? null,
        "nas_url" => $json_data['nas_url'] ?? null,
        "token" => $json_data['token'] ?? null // 如果其他 API 需要 SynoToken
    ];

    echo json_encode($config);
} else {
    // 增加一個 http 狀態碼方便 JS 除錯
    http_response_code(404);
    echo json_encode(["error" => "找不到 session_config.json，請先執行登入程式"]);
}
?>