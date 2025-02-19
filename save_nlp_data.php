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
    $required_fields = ['conc', 'avgLib', 'totalVolume', 'flowcell', 'nM', 'pMol', 'libUl', 'rsbUl', 'concCalc'];
    foreach ($required_fields as $field) {
        if (!isset($data[$field])) {
            echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
            exit;
        }
    }

    // Prepare statement for insertion
    $stmt = $conn->prepare("INSERT INTO nlp_data 
                            (conc, avgLib, totalVolume, flowcell, nM, pMol, libUl, rsbUl, concCalc) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Prepare failed: ' . $conn->error]);
        exit;
    }

    // Convert data types
    $conc = (float) $data['conc'];
    $avgLib = (float) $data['avgLib'];
    $totalVolume = (float) $data['totalVolume'];
    $flowcell = $data['flowcell'];
    $nM = (float) $data['nM'];
    $pMol = (int) $data['pMol'];
    $libUl = (float) $data['libUl'];
    $rsbUl = (float) $data['rsbUl'];
    $concCalc = (float) $data['concCalc'];

    // Bind parameters
    $stmt->bind_param("dddsdiddd", 
        $conc, 
        $avgLib, 
        $totalVolume, 
        $flowcell, 
        $nM, 
        $pMol, 
        $libUl, 
        $rsbUl, 
        $concCalc
    );

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