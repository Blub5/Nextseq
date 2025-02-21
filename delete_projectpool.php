<?php
// delete_projectpool.php
header('Content-Type: application/json');

$conn = new mysqli("localhost", "root", "", "NGSweb");

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed, use POST']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON: ' . json_last_error_msg()]);
    exit;
}

if (!isset($data['ProjectPool']) || empty($data['ProjectPool'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing or empty ProjectPool']);
    exit;
}

try {
    $stmt = $conn->prepare("DELETE FROM mixdiffpools WHERE ProjectPool = ?");
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }

    $ProjectPool = (string) $data['ProjectPool'];
    $stmt->bind_param("s", $ProjectPool);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => "Row with ProjectPool $ProjectPool deleted successfully"]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => "No row found with ProjectPool $ProjectPool"]);
        }
    } else {
        throw new Exception('Execute failed: ' . $stmt->error);
    }

    $stmt->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>