<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

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

// Retrieve POST data with default values
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

// Start transaction
$conn->begin_transaction();

try {
    // Insert into Info_user table
    $stmt1 = $conn->prepare("INSERT INTO Info_user (project, application, size, coverage, samplecount, conc, avgLibSize, cycli) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt1->bind_param("ssssssss", $project, $application, $size, $coverage, $samplecount, $conc, $avgLibSize, $cycli);

    if (!$stmt1->execute()) {
        throw new Exception($stmt1->error);
    }

    // Insert into uitkomst table
    $stmt2 = $conn->prepare("INSERT INTO uitkomst (project, clusters, nm) VALUES (?, ?, ?)");
    $stmt2->bind_param("sss", $project, $clusters, $nm);

    if (!$stmt2->execute()) {
        throw new Exception($stmt2->error);
    }

    // Commit transaction
    $conn->commit();
    echo "New record created successfully";

} catch (Exception $e) {
    // Rollback transaction
    $conn->rollback();
    if ($conn->errno == 1062) {
        echo "Error: ProjectPool must be unique. The projectPool you entered already exists.";
    } else {
        echo "Error: " . $e->getMessage();
    }
} finally {
    echo "<script>
            setTimeout(function(){
                window.location.href = 'Mixdiffpools.html';
            }, 2000);
        </script>";
    $stmt1->close();
    $stmt2->close();
    $conn->close();
}
?>
