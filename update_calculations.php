<?php
ob_start();
header('Content-Type: application/json');

error_reporting(E_ALL);
ini_set('display_errors', 0);

$conn = new mysqli("localhost", "root", "", "ngsweb");

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed, use POST']);
    exit;
}

$required_fields = ['Clusters', '%Flowcell', 'nM', '%SamplePerFlowcell', 'UI_NGS_Pool', 'ProjectPool'];
foreach ($required_fields as $field) {
    if (!isset($data[$field])) {
        echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
        exit;
    }
}

$stmt = $conn->prepare("UPDATE mixdiffpools SET 
    Clusters = ?, `%Flowcell` = ?, nM = ?, `%SamplePerFlowcell` = ?, `UI NGS Pool` = ?
    WHERE ProjectPool = ?");

if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Prepare failed: ' . $conn->error]);
    exit;
}

$clusters = (int)$data['Clusters']; // BIGINT
$flowcellPercentage = (float)$data['%Flowcell']; // DECIMAL(5,2)
$nM = (float)$data['nM']; // DECIMAL(10,4)
$samplePerFlowcell = (float)$data['%SamplePerFlowcell']; // DECIMAL(5,2)
$uiNgsPool = (float)$data['UI_NGS_Pool']; // DECIMAL(10,2)
$projectPool = $data['ProjectPool']; // VARCHAR(255)

$stmt->bind_param("idddds", $clusters, $flowcellPercentage, $nM, $samplePerFlowcell, $uiNgsPool, $projectPool);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Execute failed: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
ob_end_flush();
?>