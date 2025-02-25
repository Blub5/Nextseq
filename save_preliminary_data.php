<?php
// Ensure output buffering is on to capture any stray output
ob_start();

// Set content type
header('Content-Type: application/json');

// Enable error reporting and logging
error_reporting(E_ALL);
ini_set('display_errors', 0); // Set to 1 temporarily if you can view the output directly
ini_set('log_errors', 1);
ini_set('error_log', '/tmp/php_errors.log'); // Adjust path if needed

// Log script start
$logFile = '/tmp/save_preliminary.log'; // Adjust path if needed
file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Script started\n", FILE_APPEND);

// Database connection
$conn = new mysqli('localhost', 'NGSweb', 'BioinformatixUser2025!', 'NGSweb');

if ($conn->connect_error) {
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Connection failed: " . $conn->connect_error . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]);
    ob_end_flush();
    exit;
}

file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Connected to database\n", FILE_APPEND);

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Method not allowed: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed, use POST']);
    ob_end_flush();
    exit;
}

// Get raw input
$rawInput = file_get_contents('php://input');
file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Raw input: " . $rawInput . "\n", FILE_APPEND);

// Decode JSON
$data = json_decode($rawInput, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "JSON decode error: " . json_last_error_msg() . "\n", FILE_APPEND);
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON: ' . json_last_error_msg()]);
    ob_end_flush();
    exit;
}

file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Decoded data: " . print_r($data, true) . "\n", FILE_APPEND);

// Check required fields
$required_fields = ['RunName', 'ProjectPool', 'Application', 'GenomeSize', 'Coverage', 'SampleCount', 'Conc', 'AvgLibSize'];
foreach ($required_fields as $field) {
    if (!isset($data[$field]) || $data[$field] === '') {
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Missing or empty field: $field\n", FILE_APPEND);
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Missing or empty required field: $field"]);
        ob_end_flush();
        exit;
    }
}

try {
    // Check for existing ProjectPool
    $checkStmt = $conn->prepare("SELECT ProjectPool FROM mixdiffpools WHERE ProjectPool = ?");
    if (!$checkStmt) {
        $error = $conn->error;
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Prepare check failed: $error\n", FILE_APPEND);
        throw new Exception('Prepare check failed: ' . $error);
    }
    
    $projectPool = $data['ProjectPool'];
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Checking ProjectPool: $projectPool\n", FILE_APPEND);
    $checkStmt->bind_param("s", $projectPool);
    if (!$checkStmt->execute()) {
        $error = $checkStmt->error;
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Check execute failed: $error\n", FILE_APPEND);
        throw new Exception('Check execute failed: ' . $error);
    }
    $checkResult = $checkStmt->get_result();
    if ($checkResult->num_rows > 0) {
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "ProjectPool '$projectPool' already exists\n", FILE_APPEND);
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => "ProjectPool '$projectPool' already exists"]);
        $checkStmt->close();
        $conn->close();
        ob_end_flush();
        exit;
    }
    $checkStmt->close();

    // Insert new data
    $stmt = $conn->prepare("INSERT INTO mixdiffpools (RunName, ProjectPool, Application, GenomeSize, Coverage, SampleCount, Conc, AvgLibSize) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    if (!$stmt) {
        $error = $conn->error;
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Prepare insert failed: $error\n", FILE_APPEND);
        throw new Exception('Prepare failed: ' . $error);
    }

    $runName = $data['RunName'];
    $application = $data['Application'];
    $genomeSize = (int)$data['GenomeSize'];
    $coverage = (float)$data['Coverage'];
    $sampleCount = (int)$data['SampleCount'];
    $conc = (float)$data['Conc'];
    $avgLibSize = (int)$data['AvgLibSize'];

    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Binding params: RunName=$runName, ProjectPool=$projectPool, Application=$application, GenomeSize=$genomeSize, Coverage=$coverage, SampleCount=$sampleCount, Conc=$conc, AvgLibSize=$avgLibSize\n", FILE_APPEND);

    $stmt->bind_param("sssiddi", $runName, $projectPool, $application, $genomeSize, $coverage, $sampleCount, $conc, $avgLibSize);

    if (!$stmt->execute()) {
        $error = $stmt->error;
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Execute failed: $error\n", FILE_APPEND);
        throw new Exception('Execute failed: ' . $error);
    }

    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Data saved successfully for $projectPool\n", FILE_APPEND);
    echo json_encode(['success' => true, 'message' => "New ProjectPool '$projectPool' saved successfully under run '$runName'"]);

} catch (Exception $e) {
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Exception caught: " . $e->getMessage() . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    if (isset($stmt)) $stmt->close();
    $conn->close();
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Script ended\n", FILE_APPEND);
    ob_end_flush();
}
?>