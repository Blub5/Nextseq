<?php
include 'config.php';
error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json');

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed, use POST']);
    exit;
}

$required_fields = ['conc', 'avgLib', 'totalVolume', 'flowcell', 'nM', 'pMol', 'libUl', 'rsbUl', 'concCalc'];
foreach ($required_fields as $field) {
    if (!isset($data[$field])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
        exit;
    }
}

$stmt = $conn->prepare("INSERT INTO nlp_data 
                        (conc, avgLib, totalVolume, flowcell, nM, pMol, libUl, rsbUl, concCalc) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Prepare failed: ' . $conn->error]);
    exit;
}

$conc = (float) $data['conc'];
$avgLib = (float) $data['avgLib'];
$totalVolume = (float) $data['totalVolume'];
$flowcell = $data['flowcell'];
$nM = (float) $data['nM'];
$pMol = (int) $data['pMol'];
$libUl = (float) $data['libUl'];
$rsbUl = (float) $data['rsbUl'];
$concCalc = (float) $data['concCalc'];

$stmt->bind_param("dddsdiddd", 
    $conc, 
    $avgLib, 
    $totalVolume, 
    $flowcell, 
    $nM, 
    $pMol, 
    $libUl, 
    $rsbUl, 
    $concCalc
);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Execute failed: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>