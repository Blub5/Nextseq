<?php
// Database connection
$conn = new mysqli("localhost", "root", "", "nextseq");

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]);
    exit;
}

// Get POST data
$data = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Validate required fields
    $required_fields = ['Clusters', '%Flowcell', 'nM', '%SamplePerFlowcell', 'UI_NGS_Pool', 'ProjectPool'];
    foreach ($required_fields as $field) {
        if (!isset($data[$field])) {
            echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
            exit;
        }
    }

    // Prepare statement for updating calculations
    $stmt = $conn->prepare("UPDATE mixdiffpools SET 
        Clusters = ?, `%Flowcell` = ?, nM = ?, `%SamplePerFlowcell` = ?, `UI NGS Pool` = ?
        WHERE ProjectPool = ?");

    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Prepare failed: ' . $conn->error]);
        exit;
    }

    // Convert data to appropriate types
    $Clusters = (int)$data['Clusters'];
    $FlowcellPercentage = (float)$data['%Flowcell'];
    $nM = (float)$data['nM'];
    $SamplePerFlowcell = (float)$data['%SamplePerFlowcell'];
    $UINGS_Pool = $data['UI_NGS_Pool'];
    $ProjectPool = $data['ProjectPool'];

    // Bind parameters
    $stmt->bind_param("idddss", $Clusters, $FlowcellPercentage, $nM, $SamplePerFlowcell, $UINGS_Pool, $ProjectPool);

    // Execute the statement
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Execute failed: ' . $stmt->error]);
    }

    $stmt->close();
}

$conn->close();
?>
