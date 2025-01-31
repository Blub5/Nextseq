<?php
session_start();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['success' => false, 'message' => 'Method not allowed']));
}

if (!isset($_SESSION['csrf_token']) || 
    !isset($_POST['csrf_token']) || 
    $_SESSION['csrf_token'] !== $_POST['csrf_token']) {
    http_response_code(403);
    exit(json_encode(['success' => false, 'message' => 'Invalid token']));
}

try {
    $config = require_once 'config.php';
    $db = Database::getInstance($config['database']);
    
    $projects = json_decode($_POST['projects'], true);
    if (!$projects || !is_array($projects)) {
        throw new Exception('Invalid data format');
    }

    $db->beginTransaction();
    
    foreach ($projects as $project) {
        $db->query(
            "INSERT INTO info_user (project, application, clusters) VALUES (?, ?, ?)",
            [$project['project'], $project['application'], $project['clusters']],
            'ssd'
        );
    }

    $db->commit();
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    $db->rollback();
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred while saving data']);
}