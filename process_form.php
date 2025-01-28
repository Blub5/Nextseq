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

// Retrieve POST data
$project = $_POST['project'] ?? '';
$application = $_POST['application'] ?? '';
$size = $_POST['size'] ?? '';
$coverage = $_POST['coverage'] ?? '';
$samplecount = $_POST['sampleCount'] ?? '';
$conc = $_POST['conc'] ?? '';
$avgLibSize = $_POST['avgLibSize'] ?? '';
$cycli = $_POST['cycli'] ?? '';
$clusters = $_POST['clusters'] ?? '';
$nm = $_POST['nM'] ?? '';

// Validate inputs
if (empty($project) || empty($application) || empty($size) || !is_numeric($size)) {
    die("Invalid input. Please fill out all required fields correctly.");
}

$conn->begin_transaction();

try {
    // Insert into Info_user table
    $stmt1 = $conn->prepare("INSERT INTO Info_user (project, application, size, coverage, samplecount, conc, avgLibSize, cycli) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt1->bind_param("ssssssss", $project, $application, $size, $coverage, $samplecount, $conc, $avgLibSize, $cycli);

    if (!$stmt1->execute()) {
        throw new Exception("Info_user table: " . $stmt1->error);
    }

    // Insert into uitkomst table
    $stmt2 = $conn->prepare("INSERT INTO uitkomst (project, clusters, nm) VALUES (?, ?, ?)");
    $stmt2->bind_param("sss", $project, $clusters, $nm);

    if (!$stmt2->execute()) {
        throw new Exception("uitkomst table: " . $stmt2->error);
    }

    $conn->commit();
    echo "New record created successfully";

} catch (Exception $e) {
    $conn->rollback();
    echo "Error: " . $e->getMessage();
} finally {
    $stmt1->close();
    $stmt2->close();
    $conn->close();
}
?>
