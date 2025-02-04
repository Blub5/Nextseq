<?php
session_start();
if ($_POST['csrf_token'] !== $_SESSION['csrf_token']) {
  http_response_code(403);
  die("Invalid CSRF token");
}
$projects = json_decode($_POST['projects'], true);
if (json_last_error() !== JSON_ERROR_NONE) {
  http_response_code(400);
  die("Invalid JSON");  
}
error_log('Session CSRF Token: ' . $_SESSION['csrf_token']);
error_log('Form CSRF Token: ' . $_POST['csrf_token']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['success' => false, 'message' => 'Method not allowed']));
}

if (!isset($_SESSION['csrf_token']) || !isset($_POST['csrf_token']) || $_SESSION['csrf_token'] !== $_POST['csrf_token']) {
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