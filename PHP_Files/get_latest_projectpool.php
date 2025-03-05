<?php
include '/home/ngslab/config/config.php'
ob_start();
header('Content-Type: application/json');

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]);
    exit;
}

try {
    $result = $conn->query("
        SELECT ProjectPool 
        FROM mixdiffpools 
        WHERE ProjectPool REGEXP '^NGS-[0-9]+$'
        ORDER BY CAST(SUBSTRING_INDEX(ProjectPool, '-', -1) AS UNSIGNED) DESC 
        LIMIT 1
    ");
    
    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        echo json_encode(['success' => true, 'latestProjectPool' => $row['ProjectPool']]);
    } else {
        echo json_encode(['success' => true, 'latestProjectPool' => null]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
ob_end_flush();
?>