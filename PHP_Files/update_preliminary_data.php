<?php
ob_start();
header('Content-Type: application/json');

$conn = new mysqli('localhost', 'NGSweb', 'BioinformatixUser2025!', 'NGSweb');

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed, use POST']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON: ' . json_last_error_msg()]);
    exit;
}

// Added 'RunName' to the list of required fields
$required_fields = ['RunName', 'ProjectPool', 'Application', 'GenomeSize', 'Coverage', 'SampleCount', 'Conc', 'AvgLibSize'];
foreach ($required_fields as $field) {
    if (!isset($data[$field]) || $data[$field] === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Missing or empty required field: $field"]);
        exit;
    }
}

try {
    // Updated SQL to include RunName in the WHERE clause
    $stmt = $conn->prepare("UPDATE mixdiffpools SET 
        Application = ?, GenomeSize = ?, Coverage = ?, SampleCount = ?, Conc = ?, AvgLibSize = ?
        WHERE RunName = ? AND ProjectPool = ?");
    
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }

    $application = $data['Application'];
    $genomeSize = (int)$data['GenomeSize'];
    $coverage = (float)$data['Coverage'];
    $sampleCount = (int)$data['SampleCount'];
    $conc = (float)$data['Conc'];
    $avgLibSize = (int)$data['AvgLibSize'];
    $runName = $data['RunName'];
    $projectPool = $data['ProjectPool'];

    // Bind parameters in the correct order:
    // "s" for Application, "i" for GenomeSize, "d" for Coverage, "i" for SampleCount,
    // "d" for Conc, "i" for AvgLibSize, "s" for RunName, "s" for ProjectPool.
    $stmt->bind_param("siddidss", $application, $genomeSize, $coverage, $sampleCount, $conc, $avgLibSize, $runName, $projectPool);

    if (!$stmt->execute()) {
        throw new Exception('Execute failed: ' . $stmt->error);
    }

    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => "Updated ProjectPool '$projectPool' for RunName '$runName'"]);
    } else {
        echo json_encode(['success' => false, 'message' => "No row found with RunName '$runName' and ProjectPool '$projectPool'"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$stmt->close();
$conn->close();
ob_end_flush();
?>