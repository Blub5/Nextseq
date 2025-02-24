<?php
require_once 'config.php';

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    die('Verbindingsfout: ' . $conn->connect_error);
} else {
    echo 'Verbinding succesvol!';
}

$conn->close();
?>