<?php
header("Content-Type: text/html; charset=utf-8");


// 擷取登錄資訊，呼叫python讀取nas的照片資料

//  環境變數

require_once __DIR__ . '/../vendor/autoload.php'; // 依據實際安裝位置而定
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();
// $_ENV['PYTHON_PATH'] python執行檔位置 
// $_ENV['NAS_URL'] NAS網址


$json_file = '../mainpage/session_config.json';

// 2. 檢查檔案是否存在
if (file_exists($json_file)) {
    // 讀取並解析 JSON
    $json_content = file_get_contents($json_file);
    $json_data = json_decode($json_content, true);

    // 3. 提取需要的資訊 (根據你之前的 JSON 結構)
    // 假設 cookie_str 主要是 sid，或者你需要完整的 cookie 格式
    $cookie_str = $json_data['cookie_str'] ?? '';
    $token = $json_data['token'] ?? '';
    $nas_url = $json_data['nas_url'] ?? '';


    // 測試用輸出 (正式環境建議註解掉)
    echo "從檔案讀取的 Cookie: " . htmlspecialchars($cookie_str) . "\n";
    echo "從檔案讀取的 Token: " . htmlspecialchars($token) . "\n";
    echo "從檔案讀取的 NAS URL: " . htmlspecialchars($nas_url) . "\n";

    // 4. 準備執行環境
    // 優先從環境變數讀取，若無則給予預設值 'python3'
    $python = $_ENV['PYTHON_PATH']; 
    $script = __DIR__ . DIRECTORY_SEPARATOR . "loadphoto.py";

    // 5. 組合指令 (使用從 JSON 讀取的變數)
    // 注意：參數順序必須與你的 loadphoto.py 接收順序一致
    $cmd = escapeshellarg($python) . " " 
        . escapeshellarg($script) . " "
        . escapeshellarg($cookie_str) . " " 
        . escapeshellarg($token) . " "
        . escapeshellarg($nas_url) . " 2>&1"; // 加入 2>&1 可以捕捉 Python 的錯誤訊息

    // 6. 執行腳本
    $output = shell_exec($cmd);

    if ($output) {
        echo "<h3>Python 腳本輸出:</h3>";
        echo "<pre>" . htmlspecialchars($output) . "</pre>";
    } else {
        echo "<pre>Python 腳本沒有回傳內容，或執行過程中發生錯誤。</pre>";
    }

} else {
    // 如果找不到 JSON 檔案
    http_response_code(404);
    echo "錯誤：找不到 $json_file，請確認是否已完成登入程序。";
}
?>




