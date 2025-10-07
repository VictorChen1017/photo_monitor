<?php
header("Content-Type: text/html; charset=utf-8");

# 用來連結資料庫，將資料轉成json格式供js leatflet使用


# 資料庫連線
$mysqli = new mysqli("localhost", "root", "Chen1899", "photoexif"); // 修改帳密與DB名稱
if ($mysqli->connect_error) {
    echo "連線失敗\n" . htmlspecialchars("連線失敗: " . $mysqli->connect_error) . "</pre>";
}
//echo "✅ 資料庫連線成功！";


// 取得視窗邊界
$north = floatval($_GET['north']);
$south = floatval($_GET['south']);
$east  = floatval($_GET['east']);
$west  = floatval($_GET['west']);


// 查詢範圍內的點
// 結構化查詢以防SQL注入
$stmt = $mysqli->prepare("
    SELECT id, time, gps_latitude, gps_longitude  
    FROM photos
    WHERE gps_latitude IS NOT NULL 
      AND gps_longitude IS NOT NULL 
      AND gps_latitude BETWEEN ? AND ? 
      AND gps_longitude BETWEEN ? AND ?
");
$stmt->bind_param("dddd", $south, $north, $west, $east);
$stmt->execute();
$result = $stmt->get_result();


// 蒐集查詢結果，組成 JSON 陣列
$heatPoints = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $heatPoints[] = [
            "id" => intval($row["id"]),
            "time" => date("Y-m-d H:i:s", $row["time"]), // 格式化成日期
            "gps_latitude" => floatval($row["gps_latitude"]),
            "gps_longitude" => floatval($row["gps_longitude"])
        ];
    }
}

// 回傳 JSON 結果
header('Content-Type: application/json; charset=utf-8');
echo json_encode($heatPoints);
?>
