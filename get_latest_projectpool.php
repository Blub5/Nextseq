<?php
ob_start();
header('Content-Type: application/json');

// Include config for database connection
include('config.php');

error_reporting(E_ALL);
ini_set('display_errors', 0);

function handleError($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error',
        'debug' => ['error' => $errstr, 'file' => $errfile, 'line' => $errline]
    ]);
    exit;
}

set_error_handler('handleError');

try {
    // Database connection
    $conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);
    
    if ($conn->connect_error) {
        throw new Exception('Connection failed: ' . $conn->connect_error);
    }

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
} finally {
    $conn->close();
    ob_end_flush();
}
?>
