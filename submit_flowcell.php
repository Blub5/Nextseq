<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);


$servername = "localhost";
$username = "root";
$password = "";
$dbname = "nextseq";


$conn = new mysqli($servername, $username, $password, $dbname);


if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}


$data = json_decode(file_get_contents('php://input'), true);
$flowcell = $data['flowcell'] ?? '';
$projectPools = $data['projectPools'] ?? [];


$projectPoolsJson = json_encode($projectPools);

try {

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
