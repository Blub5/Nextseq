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

// Retrieve POST data
$project = $_POST['project'];
$application = $_POST['application'];
$size = $_POST['size'];
$coverage = $_POST['coverage'];
$sampleCount = $_POST['sampleCount'];
$conc = $_POST['conc'];
$avgLibSize = $_POST['avgLibSize'];
$cycli = $_POST['cycli'];

// Define application types
$RNA = "RNAseq";
$MGX = "MGX";
$WGS = "WGS";
$AMP = "Amplicon";

// Function to calculate clusters
function calculate_clusters($application, $size, $coverage, $sampleCount, $cycli) {
    $factor1 = ($cycli == 300) ? 270 : 450;

    switch ($application) {
        case "WGS":
            return ($size * $coverage * $sampleCount) / $factor1;
        case "RNAseq":
        case "Amplicon":
        case "MGX":
            return $coverage * $sampleCount;
        default:
            return 0;
    }
}

$clusters = calculate_clusters($application, $size, $coverage, $sampleCount, $cycli);

// Format clusters in scientific notation
$clusters = sprintf("%.2E", $clusters);

// Prepare and bind
$stmt = $conn->prepare("INSERT INTO project_data (project, application, size, coverage, sampleCount, conc, avgLibSize, cycli, clusters) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param("sssssssss", $project, $application, $size, $coverage, $sampleCount, $conc, $avgLibSize, $cycli, $clusters);

try {
    if ($stmt->execute()) {
        echo "New record created successfully";
    } else {
        throw new Exception($stmt->error);
    }
} catch (mysqli_sql_exception $e) {
    if ($e->getCode() == 1062) {
        echo "Error: ProjectPool must be unique. The projectPool you entered already exists.";
    } else {
        echo "Error: " . $e->getMessage();
    }
} finally {
    echo "<script>
            setTimeout(function(){
                window.location.href = 'mixdiffpools.html';
            }, 2000);
          </script>";
    $stmt->close();
    $conn->close();
}
?>