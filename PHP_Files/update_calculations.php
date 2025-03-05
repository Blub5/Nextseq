<?php
include '/home/ngslab/config/config.php'
ob_start();
header('Content-Type: application/json');

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

// Retrieve and decode JSON input
$rawInput = file_get_contents('php://input');
error_log("Received raw input: " . $rawInput);
$data = json_decode($rawInput, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    error_log("JSON decode error: " . json_last_error_msg());
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON: ' . json_last_error_msg()]);
    exit;
}

// Log the received data
error_log("Decoded data: " . json_encode($data));

// Validate required fields
$requiredFields = ['ProjectPool', 'Clusters', '%Flowcell', 'nM', '%SamplePerFlowcell', 'UI_NGS_Pool'];
foreach ($requiredFields as $field) {
    if (!isset($data[$field]) || $data[$field] === '') {
        error_log("Missing or empty field: $field");
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Missing or empty required field: $field"]);
        exit;
    }
}

try {
    // Prepare the update statement
    $stmt = $conn->prepare("UPDATE mixdiffpools SET 
        Clusters = ?, `%Flowcell` = ?, nM = ?, `%SamplePerFlowcell` = ?, `UI NGS Pool` = ?
        WHERE ProjectPool = ?");
    if (!$stmt) {
        error_log("Prepare failed: " . $conn->error);
        throw new Exception('Prepare failed: ' . $conn->error);
    }

    // Bind parameters
    $clusters = (int) $data['Clusters'];
    $flowcell = (float) $data['%Flowcell'];
    $nM = (float) $data['nM'];
    $samplePerFlowcell = (float) $data['%SamplePerFlowcell'];
    $uiNgsPool = (float) $data['UI_NGS_Pool'];
    $projectPool = $data['ProjectPool'];

    $stmt->bind_param("idddds", $clusters, $flowcell, $nM, $samplePerFlowcell, $uiNgsPool, $projectPool);

    // Execute the statement
    if (!$stmt->execute()) {
        error_log("Execute failed: " . $stmt->error);
        throw new Exception('Execute failed: ' . $stmt->error);
    }

    if ($stmt->affected_rows > 0) {
        error_log("Updated calculations for ProjectPool '$projectPool'");
        echo json_encode(['success' => true, 'message' => "Updated calculations for ProjectPool '$projectPool'"]);
    } else {
        error_log("No row found with ProjectPool '$projectPool'");
        echo json_encode(['success' => false, 'message' => "No row found with ProjectPool '$projectPool'"]);
    }

    $stmt->close();
} catch (Exception $e) {
    error_log("Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
ob_end_flush();
?>