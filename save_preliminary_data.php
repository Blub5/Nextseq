<?php
// Start output buffering to ensure clean JSON output
ob_start();

// Set the response content type to JSON
header('Content-Type: application/json');

// Define log file for debugging
$logFile = dirname(__FILE__) . '/save_preliminary.log';
file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Script started\n", FILE_APPEND);

// Establish database connection
$conn = new mysqli('localhost', 'NGSweb', 'BioinformatixUser2025!', 'NGSweb');
if ($conn->connect_error) {
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Connection failed: " . $conn->connect_error . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $conn->connect_error]);
    ob_end_flush();
    exit;
}
file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Connected to database\n", FILE_APPEND);

// Ensure the request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Invalid method: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed, use POST']);
    ob_end_flush();
    exit;
}

// Retrieve and decode JSON input
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

// Define required fields and validate presence
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
    // Check if ProjectPool already exists
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

    // Prepare insert statement
    $stmt = $conn->prepare("INSERT INTO mixdiffpools (RunName, ProjectPool, Application, GenomeSize, Coverage, SampleCount, Conc, AvgLibSize) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    if (!$stmt) {
        throw new Exception('Prepare insert failed: ' . $conn->error);
    }

    // Sanitize and type-cast input data
    $runName = substr((string)$data['RunName'], 0, 50);        // VARCHAR(50)
    $projectPool = substr((string)$data['ProjectPool'], 0, 255); // VARCHAR(255)
    $application = substr((string)$data['Application'], 0, 255); // VARCHAR(255)
    $genomeSize = (int)$data['GenomeSize'];                    // INT
    $coverage = (float)$data['Coverage'];                      // DECIMAL(10,2)
    $sampleCount = (int)$data['SampleCount'];                  // INT
    $conc = (float)$data['Conc'];                              // DECIMAL(10,4)
    $avgLibSize = (int)$data['AvgLibSize'];                    // INT

    // Bind parameters with appropriate types
    $stmt->bind_param("sssididi", $runName, $projectPool, $application, $genomeSize, $coverage, $sampleCount, $conc, $avgLibSize);

    // Execute the insertion
    if (!$stmt->execute()) {
        throw new Exception('Insert execution failed: ' . $stmt->error);
    }

    // Log success and send response
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Data saved for ProjectPool '$projectPool'\n", FILE_APPEND);
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => "New ProjectPool '$projectPool' saved successfully under run '$runName'"]);

} catch (Exception $e) {
    // Handle exceptions
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Error: " . $e->getMessage() . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
} finally {
    // Clean up resources
    if (isset($stmt)) $stmt->close();
    $conn->close();
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . "Script ended\n", FILE_APPEND);
    ob_end_flush();
}
?>