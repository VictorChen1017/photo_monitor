<?php


require_once __DIR__ . '/vendor/autoload.php'; // 依據實際安裝位置而定
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();
echo "DB_HOST: " . $_ENV['DB_HOST'];
echo "DB_USER: " . $_ENV['DB_USER'];
echo "DB_PASS: " . $_ENV['DB_PASS'];
echo "DB_NAME: " . $_ENV['DB_NAME'];
echo "PYTHON_PATH: " . $_ENV['PYTHON_PATH'];