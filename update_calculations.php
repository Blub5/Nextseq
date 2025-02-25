<?php
// Start output buffering
ob_start();
// Set content type
header('Content-Type: application/json');

// Enable error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Log function for debugging
function logDebug($message) {
    file_put_contents('/tmp/update_calculations.log', date('[Y-m-d H:i:s] ') . $message . "\n", FILE_APPEND);
}

logDebug("Script started");

// Database connection
$conn = new mysqli('localhost', 'NGSweb', 'BioinformatixUser2025!', 'NGSweb');

if ($conn->connect_error) {
    logDebug("Connection failed: " . $conn->connect_error);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]);
    ob_end_flush();
    exit;
}

logDebug("Connected to database");

// Get incoming data
$data = json_decode(file_get_contents('php://input'), true);
logDebug("Received data: " . print_r($data, true));

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    logDebug("Method not allowed: " . $_SERVER['REQUEST_METHOD']);
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed, use POST']);
    ob_end_flush();
    exit;
}

// Validate required fields
$required_fields = ['Clusters', '%Flowcell', 'nM', '%SamplePerFlowcell', 'UI_NGS_Pool', 'ProjectPool'];
foreach ($required_fields as $field) {
    if (!isset($data[$field]) || $data[$field] === null || $data[$field] === '') {
        logDebug("Missing or empty required field: $field");
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Missing or empty required field: $field"]);
        ob_end_flush();
        exit;
    }
}

logDebug("All required fields present");

// Prepare the UPDATE query
$stmt = $conn->prepare("UPDATE mixdiffpools SET 
    Clusters = ?, `%Flowcell` = ?, nM = ?, `%SamplePerFlowcell` = ?, `UI NGS Pool` = ?
    WHERE ProjectPool = ?");

if (!$stmt) {
    $error = $conn->error;
    logDebug("Prepare failed: $error");
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Prepare failed: ' . $error]);
    ob_end_flush();
    exit;
}

logDebug("Statement prepared");

// Bind parameters
$clusters = (int)$data['Clusters'];
$flowcellPercentage = (float)$data['%Flowcell'];
$nM = (float)$data['nM'];
$samplePerFlowcell = (float)$data['%SamplePerFlowcell'];
$uiNgsPool = (float)$data['UI_NGS_Pool'];
$projectPool = $data['ProjectPool'];

logDebug("Binding params: Clusters=$clusters, %Flowcell=$flowcellPercentage, nM=$nM, %SamplePerFlowcell=$samplePerFlowcell, UI_NGS_Pool=$uiNgsPool, ProjectPool=$projectPool");

$stmt->bind_param("idddds", $clusters, $flowcellPercentage, $nM, $samplePerFlowcell, $uiNgsPool, $projectPool);

// Execute the query
if ($stmt->execute()) {
    logDebug("Executed successfully, affected rows: " . $stmt->affected_rows);
    echo json_encode(['success' => true, 'message' => "Calculations updated for ProjectPool '$projectPool'"]);
} else {
    $error = $stmt->error;
    logDebug("Execute failed: $error");
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Execute failed: ' . $error]);
}

$stmt->close();
$conn->close();
logDebug("Script completed");
ob_end_flush();
?>