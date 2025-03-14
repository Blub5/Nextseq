<?php
define('ALLOWED_ACCESS', true);
require_once 'config.php'; // Your database connection settings

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    if (!isset($data['richtlijnen']) || !is_array($data['richtlijnen'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid input']);
        exit;
    }
    
    try {
        // Connect to the database
        $conn = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Track which "no" values are sent
        $sentNos = [];
        
        // Process each submitted row
        foreach ($data['richtlijnen'] as $richtlijn) {
            $no = $richtlijn['no'];
            $type = $richtlijn['type'];
            $size_bp = $richtlijn['size_bp'];
            $sentNos[] = $no;
            
            // Update or insert the record
            $stmt = $conn->prepare(
                "INSERT INTO richtlijnen (no, type, size_bp) 
                 VALUES (:no, :type, :size_bp) 
                 ON DUPLICATE KEY UPDATE 
                 type = :type, size_bp = :size_bp"
            );
            $stmt->execute([':no' => $no, ':type' => $type, ':size_bp' => $size_bp]);
        }
        
        // Delete records not included in the submission
        if (!empty($sentNos)) {
            $placeholders = implode(',', array_fill(0, count($sentNos), '?'));
            $stmt = $conn->prepare("DELETE FROM richtlijnen WHERE no NOT IN ($placeholders)");
            $stmt->execute($sentNos);
        } else {
            // If no data is sent, clear the table
            $conn->exec("DELETE FROM richtlijnen");
        }
        
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
}
?>