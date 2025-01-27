<?php
// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "nextseq";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Read JSON data from the request body
$data = json_decode(file_get_contents('php://input'), true);
$flowcell = $data['flowcell'] ?? '';
$projectPools = $data['projectPools'] ?? [];

// Convert project pools array to JSON for storage
$projectPoolsJson = json_encode($projectPools);

try {
    // Insert into FlowcellAssignments table
    $stmt = $conn->prepare("INSERT INTO FlowcellAssignments (flowcell, projectPools) VALUES (?, ?)");
    $stmt->bind_param("ss", $flowcell, $projectPoolsJson);

    if (!$stmt->execute()) {
        throw new Exception($stmt->error);
    }

    echo "Flowcell assignment successfully saved.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
} finally {
    $stmt->close();
    $conn->close();
}
?>
