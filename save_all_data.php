<?php
header('Content-Type: application/json');

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Include the config file for database credentials
include('config.php');

try {
    // Database connection using constants from config.php
    $conn = new PDO("mysql:host=" . DB_SERVER . ";dbname=" . DB_NAME, DB_USERNAME, DB_PASSWORD);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Get POST data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data || !isset($data['runName']) || !isset($data['rows'])) {
        throw new Exception("Invalid input data");
    }

    $runName = $data['runName'];
    $rows = $data['rows'];

    // Prepare SQL statement
    $sql = "INSERT INTO mixdiffpools (
        RunName, ProjectPool, Application, GenomeSize, Coverage, SampleCount, Conc, AvgLibSize,
        Clusters, `%Flowcell`, nM, `%SamplePerFlowcell`, `UI NGS Pool`
    ) VALUES (
        :RunName, :ProjectPool, :Application, :GenomeSize, :Coverage, :SampleCount, :Conc, :AvgLibSize,
        :Clusters, :PercentFlowcell, :nM, :PercentSamplePerFlowcell, :UINGSPool
    ) ON DUPLICATE KEY UPDATE
        RunName = VALUES(RunName),
        Application = VALUES(Application),
        GenomeSize = VALUES(GenomeSize),
        Coverage = VALUES(Coverage),
        SampleCount = VALUES(SampleCount),
        Conc = VALUES(Conc),
        AvgLibSize = VALUES(AvgLibSize),
        Clusters = VALUES(Clusters),
        `%Flowcell` = VALUES(`%Flowcell`),
        nM = VALUES(nM),
        `%SamplePerFlowcell` = VALUES(`%SamplePerFlowcell`),
        `UI NGS Pool` = VALUES(`UI NGS Pool`)";

    $stmt = $conn->prepare($sql);

    foreach ($rows as $row) {
        $stmt->execute([
            ':RunName' => $row['RunName'],
            ':ProjectPool' => $row['ProjectPool'],
            ':Application' => $row['Application'],
            ':GenomeSize' => $row['GenomeSize'],
            ':Coverage' => $row['Coverage'],
            ':SampleCount' => $row['SampleCount'],
            ':Conc' => $row['Conc'],
            ':AvgLibSize' => $row['AvgLibSize'],
            ':Clusters' => $row['Clusters'],
            ':PercentFlowcell' => $row['%Flowcell'],
            ':nM' => $row['nM'],
            ':PercentSamplePerFlowcell' => $row['%SamplePerFlowcell'],
            ':UINGSPool' => $row['UI NGS Pool']
        ]);
    }

    echo json_encode(['success' => true, 'message' => "All data saved successfully for run '$runName'"]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn = null;
?>
