<?php
define('ALLOWED_ACCESS', true);
include '/home/ngslab/ngsweb/PHP_Files/config.php';
ob_start();
header('Content-Type: application/json');

error_reporting(E_ALL);
ini_set('display_errors', 0);

function handleError($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error',
        'debug' => ['error' => $errstr, 'file' => $errfile, 'line' => $errline]
    ]);
    ob_end_flush();
    exit;
}

set_error_handler('handleError');

try {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        throw new Exception('Connection failed: ' . $conn->connect_error);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method not allowed, use POST');
    }

    $data = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON: ' . json_last_error_msg());
    }

    $table = $data['table'] ?? '';
    $sortColumn = $data['sortColumn'] ?? 'timestamp';
    $sortDirection = $data['sortDirection'] ?? 'desc';
    $filter = $data['filter'] ?? [];

    if (!in_array($table, ['mixdiffpools', 'nlp_data'])) {
        throw new Exception('Invalid table name');
    }

    $validColumns = [
        'mixdiffpools' => ['ProjectPool', 'Application', 'GenomeSize', 'Coverage', 'SampleCount', 
                          'Conc', 'AvgLibSize', 'Clusters', '%Flowcell', 'nM', '%SamplePerFlowcell', 
                          'UI NGS Pool', 'timestamp', 'RunName'],
        'nlp_data' => ['conc', 'avgLib', 'totalVolume', 'flowcell', 'nM', 'pMol', 'libUl', 
                       'rsbUl', 'concCalc', 'timestamp']
    ];

    if (!in_array($sortColumn, $validColumns[$table])) {
        $sortColumn = 'timestamp';
    }

    $sortDirection = strtoupper($sortDirection) === 'DESC' ? 'DESC' : 'ASC';

    $columnsResult = $conn->query("SHOW COLUMNS FROM `$table`");
    if (!$columnsResult) {
        throw new Exception('Failed to get table columns: ' . $conn->error);
    }

    $columns = [];
    while ($row = $columnsResult->fetch_assoc()) {
        $columns[] = $row['Field'];
    }

    $whereClause = '';
    $bindParams = [];
    $bindTypes = '';
    if (!empty($filter)) {
        $conditions = [];
        foreach ($filter as $key => $value) {
            if (in_array($key, $columns)) {
                $conditions[] = "`$key` = ?";
                $bindParams[] = $value;
                $bindTypes .= 's';
            }
        }
        if ($conditions) {
            $whereClause = ' WHERE ' . implode(' AND ', $conditions);
        }
    }

    if ($table === 'mixdiffpools' && $sortColumn === 'ProjectPool') {
        $query = "SELECT * FROM `$table`$whereClause ORDER BY 
                  CASE 
                      WHEN ProjectPool REGEXP '^NGS-[0-9]+$' 
                      THEN CAST(SUBSTRING_INDEX(ProjectPool, '-', -1) AS UNSIGNED)
                      ELSE 999999999 
                  END $sortDirection";
    } else {
        $query = "SELECT * FROM `$table`$whereClause ORDER BY `$sortColumn` $sortDirection";
    }

    if (!empty($bindParams)) {
        $stmt = $conn->prepare($query);
        if (!$stmt) {
            throw new Exception('Prepare failed: ' . $conn->error);
        }
        $stmt->bind_param($bindTypes, ...$bindParams);
        if (!$stmt->execute()) {
            throw new Exception('Execute failed: ' . $stmt->error);
        }
        $result = $stmt->get_result();
    } else {
        $result = $conn->query($query);
        if (!$result) {
            throw new Exception('Query failed: ' . $conn->error);
        }
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

    if (isset($stmt)) $stmt->close();
    $conn->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

ob_end_flush();
?>