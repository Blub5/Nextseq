<?php
// File: delete_projectpool.php
error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json');

// Include config for database connection
include('config.php');

function handleError($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error',
        'debug' => ['error' => $errstr]
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

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method not allowed, use POST');
    }

    $data = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON: ' . json_last_error_msg());
    }

    if (!isset($data['ProjectPool']) || empty($data['ProjectPool'])) {
        throw new Exception('Missing or empty ProjectPool');
    }

    $ProjectPool = $data['ProjectPool'];

    // Optional: additional validation (e.g., length check or regex)
    if (strlen($ProjectPool) > 255) {
        throw new Exception('ProjectPool value is too long');
    }

    // Prepare and execute delete statement
    $stmt = $conn->prepare("DELETE FROM mixdiffpools WHERE ProjectPool = ?");
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }

    $stmt->bind_param("s", $ProjectPool);

    if (!$stmt->execute()) {
        throw new Exception('Execute failed: ' . $stmt->error);
    }

    if ($stmt->affected_rows > 0) {
        echo json_encode([
            'success' => true,
            'message' => "Row with ProjectPool '$ProjectPool' deleted successfully"
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => "No row found with ProjectPool '$ProjectPool'"
        ]);
    }

    $stmt->close();
    $conn->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
