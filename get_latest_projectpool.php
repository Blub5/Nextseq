<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');

// Database connection
$conn = new mysqli("localhost", "root", "", "nextseq");

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]);
    exit;
}

try {
    $result = $conn->query("SELECT ProjectPool FROM mixdiffpools WHERE ProjectPool LIKE 'NGS-%' ORDER BY CAST(SUBSTRING(ProjectPool, 5) AS UNSIGNED) DESC LIMIT 1");
    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        echo json_encode(['success' => true, 'latestProjectPool' => $row['ProjectPool']]);
    } else {
        echo json_encode(['success' => true, 'latestProjectPool' => null]); // No entries yet
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>