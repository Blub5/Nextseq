<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

$conn = new mysqli("wbvr-bioinfo.wurnet.nl", "NGSweb", "BioinformaticxUser2025!", "NGSweb");

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$table = $data['table'] ?? '';
$sortColumn = $data['sortColumn'] ?? 'timestamp';
$sortDirection = $data['sortDirection'] ?? 'desc';


if (!in_array($table, ['mixdiffpools', 'nlp_data'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid table name']);
    exit;
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


$columnsQuery = "SHOW COLUMNS FROM `$table`";
$columnsResult = $conn->query($columnsQuery);
$columns = [];
while ($row = $columnsResult->fetch_assoc()) {
    $columns[] = $row['Field'];
}


$query = "SELECT * FROM `$table` ORDER BY `$sortColumn` $sortDirection";
$result = $conn->query($query);

if (!$result) {
    echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
    exit;
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
?>