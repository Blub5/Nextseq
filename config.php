<?php
return [
    'database' => [
        'host' => 'localhost',
        'user' => 'root',
        'pass' => '',
        'name' => 'nextseq'
    ],
    'flowcells' => [
        'P1' => 100e6,
        'P2' => 400e6,
        'P3' => 1200e6,
        'P4' => 1800e6
    ],
    'applications' => [
        'WGS' => ['factor_300' => 270, 'factor_600' => 450],
        'RNAseq' => ['default_factor' => 1],
        'MGX' => ['default_factor' => 1],
        'Amplicon' => ['default_factor' => 1]
    ]
];