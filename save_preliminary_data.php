<?php
ob_start();
header('Content-Type: application/json');

error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once 'config.php';

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

$required_fields = ['ProjectPool', 'Application', 'GenomeSize', 'Coverage', 'SampleCount', 'Conc', 'AvgLibSize'];
foreach ($required_fields as $field) {
    if (!isset($data[$field]) || $data[$field] === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Missing or empty required field: $field"]);
        exit;
    }
}

try {
    // Check existing ProjectPool
    $checkStmt = $conn->prepare("SELECT ProjectPool FROM mixdiffpools WHERE ProjectPool = ?");
    if (!$checkStmt) {
        throw new Exception('Prepare check failed: ' . $conn->error);
    }
    
    $projectPool = $data['ProjectPool'];
    $checkStmt->bind_param("s", $projectPool);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    if ($checkResult->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => "ProjectPool '$projectPool' already exists"]);
        $checkStmt->close();
        $conn->close();
        ob_end_flush();
        exit;
    }
    $checkStmt->close();

    // Insert new ProjectPool
    $stmt = $conn->prepare("INSERT INTO mixdiffpools (ProjectPool, Application, GenomeSize, Coverage, SampleCount, Conc, AvgLibSize) 
                           VALUES (?, ?, ?, ?, ?, ?, ?)");
    
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }

    $application = $data['Application'];
    $genomeSize = (int)$data['GenomeSize'];
    $coverage = (float)$data['Coverage'];
    $sampleCount = (int)$data['SampleCount'];
    $conc = (float)$data['Conc'];
    $avgLibSize = (int)$data['AvgLibSize'];

    $stmt->bind_param("ssididd", $projectPool, $application, $genomeSize, $coverage, $sampleCount, $conc, $avgLibSize);

    if (!$stmt->execute()) {
        throw new Exception('Execute failed: ' . $stmt->error);
    }

    echo json_encode(['success' => true, 'message' => "New ProjectPool '$projectPool' saved successfully"]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$stmt->close();
$conn->close();
ob_end_flush();
?>