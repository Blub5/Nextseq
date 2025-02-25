<?php
$conn = new mysqli('localhost', 'NGSweb', 'BioinformatixUser2025!', 'NGSweb');
if ($conn->connect_error) {
    die(json_encode(['success' => false, 'message' => 'Database connection failed']));
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !isset($data['rows'])) {
    die(json_encode(['success' => false, 'message' => 'Invalid data']));
}

$rows = $data['rows'];
$runName = $data['runName'];

$stmt = $conn->prepare("
    INSERT INTO mixdiffpools (
        RunName, ProjectPool, Application, GenomeSize, Coverage, SampleCount, Conc, AvgLibSize,
        Clusters, `%Flowcell`, nM, `%SamplePerFlowcell`, `UI NGS Pool`
    ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
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
        `UI NGS Pool` = VALUES(`UI NGS Pool`)
");

if (!$stmt) {
    die(json_encode(['success' => false, 'message' => 'Prepare failed: ' . $conn->error]));
}

foreach ($rows as $row) {
    $stmt->bind_param("sssiiddddidd",
        $runName,
        $row['ProjectPool'],
        $row['Application'],
        $row['GenomeSize'],
        $row['Coverage'],
        $row['SampleCount'],
        $row['Conc'],
        $row['AvgLibSize'],
        $row['Clusters'],
        $row['%Flowcell'],
        $row['nM'],
        $row['%SamplePerFlowcell'],
        $row['UI NGS Pool']
    );

    if (!$stmt->execute()) {
        die(json_encode(['success' => false, 'message' => 'Execute failed: ' . $stmt->error]));
    }
}

echo json_encode(['success' => true, 'message' => 'All data saved successfully']);
$stmt->close();
$conn->close();
?>