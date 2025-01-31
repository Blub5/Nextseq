<?php
session_start();
header('Content-Type: application/json');
try {
    $config = require_once 'config.php';
    $db = Database::getInstance($config['database']);
    
    $sql = "SELECT project, application, clusters, flowcell FROM info_user";
    $result = $db->query($sql);
    
    $projects = [];
    while ($row = $result->fetch_assoc()) {
        $projects[] = [
            'project' => htmlspecialchars($row['project']),
            'application' => htmlspecialchars($row['application']),
            'clusters' => floatval($row['clusters']),
            'flowcell' => htmlspecialchars($row['flowcell'] ?? 'N/A')
        ];
    }
    
    echo json_encode(['success' => true, 'data' => $projects]);
} catch (Exception $e) {
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred while fetching data']);
}