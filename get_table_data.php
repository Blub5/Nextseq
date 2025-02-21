<?php
// File: get_table_data.php
error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json');

function handleError($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error',
        'debug' => ['error' => $errstr]
    ]);
    exit;
}

set_error_handler('handleError');

try {
    $conn = new mysqli("wbvr-bioinfo.wurnet.nl", "NGSweb", "BioinformaticxUser2025!", "NGSweb");
    
    if ($conn->connect_error) {
        throw new Exception('Connection failed: ' . $conn->connect_error);
    }

    $data = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON: ' . json_last_error_msg());
    }

    $table = $data['table'] ?? '';
    $sortColumn = $data['sortColumn'] ?? 'timestamp';
    $sortDirection = $data['sortDirection'] ?? 'desc';

    if (!in_array($table, ['mixdiffpools', 'nlp_data'])) {
        throw new Exception('Invalid table name');
    }

    $validColumns = [
        'mixdiffpools' => ['ProjectPool', 'Application', 'GenomeSize', 'Coverage', 'SampleCount', 
                          'Conc', 'AvgLibSize', 'Clusters', '%Flowcell', 'nM', '%SamplePerFlowcell', 
                          'UI NGS Pool', 'timestamp'],
        'nlp_data' => ['conc', 'avgLib', 'totalVolume', 'flowcell', 'nM', 'pMol', 'libUl', 
                       'rsbUl', 'concCalc', 'timestamp']
    ];

    if (!in_array($sortColumn, $validColumns[$table])) {
        $sortColumn = 'timestamp';
    }

    $sortDirection = strtoupper($sortDirection) === 'DESC' ? 'DESC' : 'ASC';

    $columnsResult = $conn->query("SHOW COLUMNS FROM `$table`");
    if (!$columnsResult) {
        throw new Exception('Failed to get table columns');
    }

    $columns = [];
    while ($row = $columnsResult->fetch_assoc()) {
        $columns[] = $row['Field'];
    }

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

    $result = $conn->query($query);
    if (!$result) {
        throw new Exception('Query failed: ' . $conn->error);
    }

    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }

    echo json_encode([
        'success' => true,
        'data' => $data,
        'columns' => $columns
    ]);

    $conn->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>