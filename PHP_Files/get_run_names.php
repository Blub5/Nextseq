<?php
include '/home/ngslab/config/config.php'
header('Content-Type: application/json');

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]);
    exit;
}

$result = $conn->query("SELECT DISTINCT RunName FROM mixdiffpools ORDER BY RunName");

if ($result) {
    $runNames = $result->fetch_all(MYSQLI_ASSOC);
    echo json_encode(['success' => true, 'runNames' => array_column($runNames, 'RunName')]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
}

$conn->close();
?>