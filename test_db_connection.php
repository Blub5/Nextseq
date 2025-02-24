<?php
$host = 'localhost'; // Probeer dit eerst
$user = 'NGSweb'; // Vervang door je databasegebruikersnaam
$pass = 'BioinformatixUser2025!'; // Vervang door je databasewachtwoord
$db = 'NGSweb'; // Vervang door je databasenaam

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die('Verbindingsfout: ' . $conn->connect_error);
} else {
    echo 'Verbinding succesvol!';
}

$conn->close();
?>