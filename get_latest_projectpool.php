<?php
ob_start();
header('Content-Type: application/json');

error_reporting(E_ALL);
ini_set('display_errors', 0);

$conn = new mysqli("localhost", "root", "", "ngsweb");

if ($conn->connect_error) {
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
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
ob_end_flush();
?>