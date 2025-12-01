<?php
header("Content-Type: text/html; charset=utf-8");
file_put_contents("debug_php.log", "收到 prompt: ".$_POST["prompt"]."\n", FILE_APPEND);
//  環境變數

require_once __DIR__ . '/../vendor/autoload.php'; // 依據實際安裝位置而定
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

$python = $_ENV['PYTHON_PATH']; // 從環境變數讀取python執行檔位置
$script = __DIR__ . DIRECTORY_SEPARATOR . "aiquery.py"; // 定位此檔案的資料夾

// 處理前端UI 與後端PYTHON ai問答的交互

$prompt = $_POST["prompt"];
$cmd = $python . " " . $script . " " . escapeshellarg($prompt);
$result = shell_exec($cmd);
echo $result;



?>

