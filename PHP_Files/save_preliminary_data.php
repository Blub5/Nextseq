<?php
include '/home/ngslab/config/config.php'
ob_start();
header('Content-Type: application/json');

$logFile = __DIR__ . '/save_preliminary.log';
file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Script started\n", FILE_APPEND);

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_error) {
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Connection failed: " . $conn->connect_error . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $conn->connect_error]);
    ob_end_flush();
    exit;
}
file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Connected to database\n", FILE_APPEND);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Invalid method: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed, use POST']);
    ob_end_flush();
    exit;
}

$rawInput = file_get_contents('php://input');
file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Raw input: " . $rawInput . "\n", FILE_APPEND);
$data = json_decode($rawInput, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "JSON decode error: " . json_last_error_msg() . "\n", FILE_APPEND);
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON: ' . json_last_error_msg()]);
    ob_end_flush();
    exit;
}
file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Decoded data: " . print_r($data, true) . "\n", FILE_APPEND);

$requiredFields = ['RunName', 'ProjectPool', 'Application', 'GenomeSize', 'Coverage', 'SampleCount', 'Conc', 'AvgLibSize'];
foreach ($requiredFields as $field) {
    if (!isset($data[$field]) || $data[$field] === '' || $data[$field] === null) {
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Missing or empty field: $field\n", FILE_APPEND);
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Missing or empty required field: $field"]);
        ob_end_flush();
        exit;
    }
}

try {
    $checkStmt = $conn->prepare("SELECT ProjectPool FROM mixdiffpools WHERE ProjectPool = ?");
    if (!$checkStmt) {
        throw new Exception('Prepare check failed: ' . $conn->error);
    }
    $projectPool = $data['ProjectPool'];
    $checkStmt->bind_param("s", $projectPool);
    if (!$checkStmt->execute()) {
        throw new Exception('Check execution failed: ' . $checkStmt->error);
    }
    $checkResult = $checkStmt->get_result();
    if ($checkResult->num_rows > 0) {
        file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "ProjectPool '$projectPool' already exists\n", FILE_APPEND);
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => "ProjectPool '$projectPool' already exists"]);
        $checkStmt->close();
        $conn->close();
        ob_end_flush();
        exit;
    }
    $checkStmt->close();

    $stmt = $conn->prepare("INSERT INTO mixdiffpools (RunName, ProjectPool, Application, GenomeSize, Coverage, SampleCount, Conc, AvgLibSize) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    if (!$stmt) {
        throw new Exception('Prepare insert failed: ' . $conn->error);
    }

    $runName = substr((string)$data['RunName'], 0, 50);
    $projectPool = substr((string)$data['ProjectPool'], 0, 255);
    $application = substr((string)$data['Application'], 0, 255);
    $genomeSize = (int)$data['GenomeSize'];
    $coverage = (float)$data['Coverage'];
    $sampleCount = (int)$data['SampleCount'];
    $conc = (float)$data['Conc'];
    $avgLibSize = (int)$data['AvgLibSize'];

    $stmt->bind_param("sssididi", $runName, $projectPool, $application, $genomeSize, $coverage, $sampleCount, $conc, $avgLibSize);

    if (!$stmt->execute()) {
        throw new Exception('Insert execution failed: ' . $stmt->error);
    }

    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Data saved for ProjectPool '$projectPool'\n", FILE_APPEND);
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => "New ProjectPool '$projectPool' saved successfully under run '$runName'"]);

} catch (Exception $e) {
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Error: " . $e->getMessage() . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
} finally {
    if (isset($stmt)) $stmt->close();
    $conn->close();
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Script ended\n", FILE_APPEND);
    ob_end_flush();
}
?>