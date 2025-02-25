<?php
header('Content-Type: application/json');

// Include config for database connection
include('config.php');

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

    // Run the query to fetch distinct RunNames
    $result = $conn->query("SELECT DISTINCT RunName FROM mixdiffpools ORDER BY RunName");

    if ($result) {
        $runNames = $result->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['success' => true, 'runNames' => array_column($runNames, 'RunName')]);
    } else {
        throw new Exception('Query failed: ' . $conn->error);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($conn)) $conn->close();
}
?>
