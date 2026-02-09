<?php
header("Content-Type: text/html; charset=utf-8");

//  這是首頁登錄頁面
//  環境變數

require_once __DIR__ . '/../vendor/autoload.php'; // 依據實際安裝位置而定
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();
// $_ENV['PYTHON_PATH'] python執行檔位置 
// $_ENV['NAS_URL'] NAS網址


# 這裡填入你的 cookie 字串 和 token 從前端COOKIE介面獲取
# 接收來自login.html的POST請求

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $cookie_str = $_POST['cookie_str'] ?? '';
    $token = $_POST['token'] ?? '';
      // 測試用輸出
    echo "收到的 Cookie: " . htmlspecialchars($cookie_str) . "\n";
    echo "收到的 Token: " . htmlspecialchars($token) . "\n";

    $python = $_ENV['PYTHON_PATH']; // 從環境變數讀取python執行檔位置
    $script = __DIR__ . DIRECTORY_SEPARATOR . "login.py"; // 定位此檔案的資料夾
    $cmd = escapeshellarg($python) . " " 
        . escapeshellarg($script) . " "
        . escapeshellarg($cookie_str) . " " 
        . escapeshellarg($token) . " "
        . escapeshellarg($_ENV['NAS_URL']);

    $output = shell_exec($cmd);

    if ($output) {
        echo "<pre> Python 腳本輸出:\n" . htmlspecialchars_decode($output, ENT_QUOTES) . "</pre>";
    } else {
        echo "<pre> Python 腳本沒有回傳任何內容，可能執行失敗</pre>";
    }

} else {
    echo "token傳輸的方法有誤 或未收到請求";
}


#$cookie_str = "_SSID=oYcxi6AA19cL0xcl5oaoE_3jhk5JUM-HJh7GjX75hjU; stay_login=0; did=3mvxdgJ3AdjrBvxeHhPYq-NBY2A0ZxOD6jGMRJfnGyDuIOrG9RRW2SMRU4XknKKw2wHDkZ_M18T0HRC_HRYkMw; _CrPoSt=cHJvdG9jb2w9aHR0cHM6OyBwb3J0PTsgcGF0aG5hbWU9Lzs%3D; type=tunnel; id=xTdodm1e-YU7asSv05peX_UGBxAvd84cos5p-rUMiCEOnvvKzublvZw7q1cJm3WPLiVBjz7IRtIloo5o68cFZ0; io=L_FMb8BY-vsbJ_x2AAA9";
#$token = "HPD3XLbB0mMgA";



?>

