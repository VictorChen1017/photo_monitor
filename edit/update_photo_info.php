<?php
// 接收 JSON POST
$data = json_decode(file_get_contents('php://input'), true);

$unit_id = $data['unit_id'];
$lat = (float)$data['lat'];
$lng = (float)$data['lng'];
$new_time = strtotime($data['time']); // 轉回 Unix Timestamp

$mysqli = new mysqli("localhost", "root", "Chen1899", "photoexif");

// 更新自建資料庫中的座標與時間
$sql = "UPDATE photos SET gps_latitude = ?, gps_longitude = ?, time = ? WHERE unit_id = ?";
$stmt = $mysqli->prepare($sql);
$stmt->bind_param("ddis", $lat, $lng, $new_time, $unit_id);

if ($stmt->execute()) {
    echo json_encode(["status" => "success"]);

} else {
    echo json_encode(["status" => "error", "message" => $mysqli->error]);
}
?>