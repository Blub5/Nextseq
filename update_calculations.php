<?php
ob_start();
header('Content-Type: application/json');

// Enable error reporting, but disable display
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', dirname(__FILE__) . '/php_errors.log');

$conn = new mysqli('localhost', 'NGSweb', 'BioinformatixUser2025!', 'NGSweb');

if ($conn->connect_error) {
    ob_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]);
    ob_end_flush();
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_clean();
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed, use POST']);
    ob_end_flush();
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    ob_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON: ' . json_last_error_msg()]);
    ob_end_flush();
    exit;
}

// Validate required fields
$required_fields = ['ProjectPool', 'Clusters', '%Flowcell', 'nM', '%SamplePerFlowcell', 'UI_NGS_Pool'];
foreach ($required_fields as $field) {
    if (!isset($data[$field])) {
        ob_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
        ob_end_flush();
        exit;
    }
}

try {
    $stmt = $conn->prepare("UPDATE mixdiffpools SET 
        Clusters = ?, `%Flowcell` = ?, nM = ?, `%SamplePerFlowcell` = ?, `UI NGS Pool` = ?
        WHERE ProjectPool = ?");
    
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }

    $clusters = (int)$data['Clusters'];
    $flowcellPercentage = (float)$data['%Flowcell'];
    $nM = (float)$data['nM'];
    $samplePerFlowcell = (float)$data['%SamplePerFlowcell'];
    $uiNgsPool = (float)$data['UI_NGS_Pool'];
    $projectPool = $data['ProjectPool'];

    $stmt->bind_param("idddds", $clusters, $flowcellPercentage, $nM, $samplePerFlowcell, $uiNgsPool, $projectPool);

    if (!$stmt->execute()) {
        throw new Exception('Execute failed: ' . $stmt->error);
    }

    if ($stmt->affected_rows > 0) {
        ob_clean();
        echo json_encode(['success' => true, 'message' => "Updated calculations for ProjectPool '$projectPool'"]);
    } else {
        ob_clean();
        echo json_encode(['success' => false, 'message' => "No row found with ProjectPool '$projectPool'"]);
    }

    $stmt->close();
} catch (Exception $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
ob_end_flush();
?>