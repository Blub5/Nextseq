<?php
ob_start();
header('Content-Type: application/json');

// Enable error reporting and logging for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0); // Set to 1 temporarily if needed
ini_set('log_errors', 1);
ini_set('error_log', '/tmp/php_errors.log'); // Adjust path as needed

// Log script start
file_put_contents('/tmp/save_preliminary.log', date('[Y-m-d H:i:s] ') . "Script started\n", FILE_APPEND);

$conn = new mysqli('localhost', 'NGSweb', 'BioinformatixUser2025!', 'NGSweb');

if ($conn->connect_error) {
    file_put_contents('/tmp/save_preliminary.log', date('[Y-m-d H:i:s] ') . "Connection failed: " . $conn->connect_error . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]);
    ob_end_flush();
    exit;
}

file_put_contents('/tmp/save_preliminary.log', date('[Y-m-d H:i:s] ') . "Connected to database\n", FILE_APPEND);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed, use POST']);
    ob_end_flush();
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
file_put_contents('/tmp/save_preliminary.log', date('[Y-m-d H:i:s] ') . "Received data: " . print_r($data, true) . "\n", FILE_APPEND);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON: ' . json_last_error_msg()]);
    ob_end_flush();
    exit;
}

$required_fields = ['RunName', 'ProjectPool', 'Application', 'GenomeSize', 'Coverage', 'SampleCount', 'Conc', 'AvgLibSize'];
foreach ($required_fields as $field) {
    if (!isset($data[$field]) || $data[$field] === '') {
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
        throw new Exception('Prepare check failed: ' . $conn->error);
    }
    
    $projectPool = $data['ProjectPool'];
    $checkStmt->bind_param("s", $projectPool);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    if ($checkResult->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => "ProjectPool '$projectPool' already exists"]);
        $checkStmt->close();
        $conn->close();
        ob_end_flush();
        exit;
    }
    $checkStmt->close();

    // Insert new data with RunName
    $stmt = $conn->prepare("INSERT INTO mixdiffpools (RunName, ProjectPool, Application, GenomeSize, Coverage, SampleCount, Conc, AvgLibSize) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }

    $runName = $data['RunName'];
    $application = $data['Application'];
    $genomeSize = (int)$data['GenomeSize'];
    $coverage = (float)$data['Coverage'];
    $sampleCount = (int)$data['SampleCount'];
    $conc = (float)$data['Conc'];
    $avgLibSize = (int)$data['AvgLibSize'];

    file_put_contents('/tmp/save_preliminary.log', date('[Y-m-d H:i:s] ') . "Binding params: RunName=$runName, ProjectPool=$projectPool, Application=$application, GenomeSize=$genomeSize, Coverage=$coverage, SampleCount=$sampleCount, Conc=$conc, AvgLibSize=$avgLibSize\n", FILE_APPEND);

    $stmt->bind_param("sssiddi", $runName, $projectPool, $application, $genomeSize, $coverage, $sampleCount, $conc, $avgLibSize);

    if (!$stmt->execute()) {
        throw new Exception('Execute failed: ' . $stmt->error);
    }

    echo json_encode(['success' => true, 'message' => "New ProjectPool '$projectPool' saved successfully under run '$runName'"]);
    file_put_contents('/tmp/save_preliminary.log', date('[Y-m-d H:i:s] ') . "Data saved successfully for $projectPool\n", FILE_APPEND);

} catch (Exception $e) {
    file_put_contents('/tmp/save_preliminary.log', date('[Y-m-d H:i:s] ') . "Error: " . $e->getMessage() . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$stmt->close();
$conn->close();
ob_end_flush();
?>