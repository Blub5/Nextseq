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
$cycli = 270;

// Define application types
$RNA = "RNAseq";
$MGX = "MGX";
$WGS = "WGS";
$AMP = "Amplicon";
$AI = "AI"; 

$Fixed_cycli = 450; 

$lookup_table = [
    150 => 1,
];

// Lookup function
function vlookup($key, $table) {
    return isset($table[$key]) ? $table[$key] : 1; 
}

// Function to calculate clusters
function calculate_clusters($application, $size, $coverage, $sampleCount, $conc, $lookup_table, $RNA, $MGX, $WGS, $AMP, $AI, $Fixed_cycli) {
    if (in_array($application, [$WGS, $AMP, $AI])) {
        return ($size * $coverage * $sampleCount) / 270;
    } elseif ($application == $MGX) {
        return (1 / vlookup($Fixed_cycli, $lookup_table)) * $size * $coverage * $sampleCount;
    } elseif ($application == $RNA) {
        return $sampleCount * 1000000;
    } else {
        return 0;
    }
}

$clusters = calculate_clusters($application, $size, $coverage, $sampleCount, $conc, $lookup_table, $RNA, $MGX, $WGS, $AMP, $AI, $Fixed_cycli);

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