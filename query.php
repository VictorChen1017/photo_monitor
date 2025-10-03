<?php
header("Content-Type: text/html; charset=utf-8");

# 用來連結資料庫，將資料轉成json格式供js leatflet使用


# 資料庫連線
$mysqli = new mysqli("localhost", "root", "Chen1899", "photoexif"); // 修改帳密與DB名稱
if ($mysqli->connect_error) {
    echo "連線失敗\n" . htmlspecialchars("連線失敗: " . $mysqli->connect_error) . "</pre>";
}
//echo "✅ 資料庫連線成功！";


// 2. 查詢資料（只抓有經緯度的）
$sql = "SELECT gps_latitude, gps_longitude 
        FROM photos
        WHERE gps_latitude IS NOT NULL 
          AND gps_longitude IS NOT NULL";
$result = $mysqli->query($sql);

//蒐集查詢資料 並製作成 heatmap需要的格式
$heatPoints = [];
if ($result && $result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $heatPoints[] = [
            floatval($row["gps_latitude"]),
            floatval($row["gps_longitude"])
            // 不需要 intensity
        ];
    }
}

$mysqli->close();

// 3. 回傳 JSON
echo json_encode($heatPoints);


?>

