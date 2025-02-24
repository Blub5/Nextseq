<?php
// Start output buffering to ensure headers are sent correctly
ob_start();
header('Content-Type: application/json');

// Enable error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Database connection (adjust credentials as needed)
$conn = new mysqli('localhost', 'NGSweb', 'BioinformatixUser2025!', 'NGSweb');

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]);
    ob_end_flush();
    exit;
}

// Get incoming data
$data = json_decode(file_get_contents('php://input'), true);

// Log incoming data for debugging
file_put_contents('/tmp/update_calculations.log', "Received data: " . print_r($data, true) . "\n", FILE_APPEND);

// Ensure the request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed, use POST']);
    ob_end_flush();
    exit;
}

// Define required fields
$required_fields = ['Clusters', '%Flowcell', 'nM', '%SamplePerFlowcell', 'UI_NGS_Pool', 'ProjectPool'];
foreach ($required_fields as $field) {
    if (!isset($data[$field])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
        ob_end_flush();
        exit;
    }
}

// Prepare the UPDATE query
$stmt = $conn->prepare("UPDATE mixdiffpools SET 
    Clusters = ?, `%Flowcell` = ?, nM = ?, `%SamplePerFlowcell` = ?, `UI NGS Pool` = ?
    WHERE ProjectPool = ?");

if (!$stmt) {
    $error = $conn->error;
    file_put_contents('/tmp/update_calculations.log', "Prepare failed: $error\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Prepare failed: ' . $error]);
    ob_end_flush();
    exit;
}

// Bind parameters with correct types
$clusters = (int)$data['Clusters'];
$flowcellPercentage = (float)$data['%Flowcell'];
$nM = (float)$data['nM'];
$samplePerFlowcell = (float)$data['%SamplePerFlowcell'];
$uiNgsPool = (float)$data['UI_NGS_Pool'];
$projectPool = $data['ProjectPool'];

// Log bound parameters
file_put_contents('/tmp/update_calculations.log', "Binding params: $clusters, $flowcellPercentage, $nM, $samplePerFlowcell, $uiNgsPool, $projectPool\n", FILE_APPEND);

$stmt->bind_param("idddds", $clusters, $flowcellPercentage, $nM, $samplePerFlowcell, $uiNgsPool, $projectPool);

// Execute the query
if ($stmt->execute()) {
    file_put_contents('/tmp/update_calculations.log', "Executed successfully, affected rows: " . $stmt->affected_rows . "\n", FILE_APPEND);
    echo json_encode(['success' => true]);
} else {
    $error = $stmt->error;
    file_put_contents('/tmp/update_calculations.log', "Execute failed: $error\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Execute failed: ' . $error]);
}

$stmt->close();
$conn->close();
ob_end_flush();
?>