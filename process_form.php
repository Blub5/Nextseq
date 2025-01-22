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
$clusters = $_POST['clusters'];
$flowcell = $_POST['%flowcell'];
$nm = $_POST['nM'];
$sample_per_flowcell = $_POST['%samplePerP2'];
$ul_ngs_pool = $_POST['ulNGSPool'];

// Prepare and bind
$stmt = $conn->prepare("INSERT INTO project_data (project, application, size, coverage, sampleCount, conc, avgLibSize, cycli, clusters, flowcell, nm, sample_per_flowcell, ul_ngs_pool) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param("sssssssssssss", $project, $application, $size, $coverage, $sampleCount, $conc, $avgLibSize, $cycli, $clusters, $flowcell, $nm, $sample_per_flowcell, $ul_ngs_pool);

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