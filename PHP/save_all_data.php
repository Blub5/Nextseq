<?php
header('Content-Type: application/json');

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$servername = "localhost";
$username = "NGSweb";
$password = "BioinformatixUser2025!";
$dbname = "NGSweb";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data || !isset($data['runName']) || !isset($data['rows'])) {
        throw new Exception("Invalid input data");
    }

    $runName = $data['runName'];
    $rows = $data['rows'];

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