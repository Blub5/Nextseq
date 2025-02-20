<?php
// Enable error reporting for debugging (disable in production)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Ensure JSON content type is set before any output
header('Content-Type: application/json');

// Database connection
$conn = new mysqli("localhost", "root", "", "nextseq");

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]);
    exit;
}

// Ensure this is a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed, use POST']);
    exit;
}

// Get POST data
$data = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON: ' . json_last_error_msg()]);
    exit;
}

// Validate required fields
$required_fields = ['ProjectPool', 'Application', 'GenomeSize', 'Coverage', 'SampleCount', 'Conc', 'AvgLibSize'];
foreach ($required_fields as $field) {
    if (!isset($data[$field]) || $data[$field] === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Missing or empty required field: $field"]);
        exit;
    }
}

try {
    // Prepare statement for insertion
    $stmt = $conn->prepare("INSERT INTO mixdiffpools (ProjectPool, Application, GenomeSize, Coverage, SampleCount, Conc, AvgLibSize) 
                            VALUES (?, ?, ?, ?, ?, ?, ?)");
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }

    // Convert data types and bind parameters
    $ProjectPool = (string) $data['ProjectPool'];
    $Application = (string) $data['Application'];
    $GenomeSize = (int) $data['GenomeSize'];
    $Coverage = (int) $data['Coverage'];
    $SampleCount = (int) $data['SampleCount'];
    $Conc = (float) $data['Conc'];
    $AvgLibSize = (float) $data['AvgLibSize'];

    $stmt->bind_param("ssiiidd", $ProjectPool, $Application, $GenomeSize, $Coverage, $SampleCount, $Conc, $AvgLibSize);

    // Execute the statement
    if (!$stmt->execute()) {
        throw new Exception('Execute failed: ' . $stmt->error);
    }

    // Success response
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Data saved successfully']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    // Clean up
    if (isset($stmt)) {
        $stmt->close();
    }
    $conn->close();
}
?>