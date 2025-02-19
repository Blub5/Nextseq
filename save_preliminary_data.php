<?php

header('Content-Type: application/json');
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
    $required_fields = ['ProjectPool', 'Application', 'GenomeSize', 'Coverage', 'SampleCount', 'Conc', 'AvgLibSize'];
    foreach ($required_fields as $field) {
        if (!isset($data[$field])) {
            echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
            exit;
        }
    }

    // Prepare statement for initial data insertion
    $stmt = $conn->prepare("INSERT INTO mixdiffpools (ProjectPool, Application, GenomeSize, Coverage, SampleCount, Conc, AvgLibSize) 
                            VALUES (?, ?, ?, ?, ?, ?, ?)");

    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Prepare failed: ' . $conn->error]);
        exit;
    }

    // Convert data types before binding
    $ProjectPool = $data['ProjectPool'];
    $Application = $data['Application'];
    $GenomeSize = (int) $data['GenomeSize'];
    $Coverage = (int) $data['Coverage'];
    $SampleCount = (int) $data['SampleCount'];
    $Conc = (float) $data['Conc'];
    $AvgLibSize = (float) $data['AvgLibSize'];

    // Bind parameters
    $stmt->bind_param("ssiiidd", $ProjectPool, $Application, $GenomeSize, $Coverage, $SampleCount, $Conc, $AvgLibSize);

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
