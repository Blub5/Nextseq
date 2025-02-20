<?php
// get_latest_projectpool.php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');

$conn = new mysqli("localhost", "root", "", "nextseq");

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]);
    exit;
}

try {
    // Changed query to properly sort numerically by converting the substring to unsigned integer
    $result = $conn->query("
        SELECT ProjectPool 
        FROM mixdiffpools 
        WHERE ProjectPool REGEXP '^NGS-[0-9]+$'
        ORDER BY CAST(SUBSTRING_INDEX(ProjectPool, '-', -1) AS UNSIGNED) DESC 
        LIMIT 1
    ");
    
    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        echo json_encode(['success' => true, 'latestProjectPool' => $row['ProjectPool']]);
    } else {
        echo json_encode(['success' => true, 'latestProjectPool' => null]); 
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();

// get_table_data.php modification
// Replace the existing ORDER BY clause in get_table_data.php with this:
if ($table === 'mixdiffpools' && $sortColumn === 'ProjectPool') {
    $query = "SELECT * FROM `$table` ORDER BY 
              CASE 
                  WHEN ProjectPool REGEXP '^NGS-[0-9]+$' 
                  THEN CAST(SUBSTRING_INDEX(ProjectPool, '-', -1) AS UNSIGNED)
                  ELSE 999999999 
              END $sortDirection";
} else {
    $query = "SELECT * FROM `$table` ORDER BY `$sortColumn` $sortDirection";
}