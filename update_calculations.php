<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$conn = new mysqli("wbvr-bioinfo.wurnet.nl", "NGSweb", "BioinformaticxUser2025!", "NGSweb");

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
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

    $Clusters = (float)$data['Clusters'];
    $FlowcellPercentage = (float)$data['%Flowcell'];
    $nM = (float)$data['nM'];
    $SamplePerFlowcell = (float)$data['%SamplePerFlowcell'];
    $UINGS_Pool = (float)$data['UI_NGS_Pool'];
    $ProjectPool = $data['ProjectPool'];

    $stmt->bind_param("ddddds", $Clusters, $FlowcellPercentage, $nM, $SamplePerFlowcell, $UINGS_Pool, $ProjectPool);

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Execute failed: ' . $stmt->error]);
    }

    $stmt->close();
}

$conn->close();
?>