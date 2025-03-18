-- phpMyAdmin SQL Dump
-- version 5.1.1deb5ubuntu1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Mar 18, 2025 at 01:52 PM
-- Server version: 10.6.18-MariaDB-0ubuntu0.22.04.1
-- PHP Version: 8.1.2-1ubuntu2.20

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `NGSweb`
--

-- --------------------------------------------------------

--
-- Table structure for table `mixdiffpools`
--

CREATE TABLE `mixdiffpools` (
  `ProjectPool` varchar(255) NOT NULL,
  `Application` varchar(255) DEFAULT NULL,
  `GenomeSize` int(11) DEFAULT NULL,
  `Coverage` decimal(10,2) DEFAULT NULL,
  `SampleCount` int(11) DEFAULT NULL,
  `Conc` decimal(10,4) DEFAULT NULL,
  `AvgLibSize` int(11) DEFAULT NULL,
  `Clusters` int(11) DEFAULT NULL,
  `%Flowcell` decimal(10,2) DEFAULT NULL,
  `nM` decimal(10,4) DEFAULT NULL,
  `%SamplePerFlowcell` decimal(10,2) DEFAULT NULL,
  `UI NGS Pool` decimal(10,2) DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `RunName` varchar(50) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `mixdiffpools`
--

INSERT INTO `mixdiffpools` (`ProjectPool`, `Application`, `GenomeSize`, `Coverage`, `SampleCount`, `Conc`, `AvgLibSize`, `Clusters`, `%Flowcell`, `nM`, `%SamplePerFlowcell`, `UI NGS Pool`, `timestamp`, `RunName`) VALUES
('NGS-5', 'WGS', 5200000, '100.00', 1, '1.0000', 550, 1925926, '1.93', '2.8015', '1.93', '11.82', '2025-02-27 10:20:42', 'NGS-25-AP-AV-AX-AY'),
('NGS-6', 'Amplicon', 450, '100000.00', 8, '1.0000', 450, 800000, '0.80', '3.4241', '0.10', '4.02', '2025-02-27 10:20:42', 'NGS-25-AP-AV-AX-AY'),
('NGS-7', 'Amplicon', 450, '100000.00', 48, '1.0000', 450, 4800000, '4.80', '3.4241', '0.10', '24.10', '2025-02-27 10:20:42', 'NGS-25-AP-AV-AX-AY'),
('NGS-8', 'Amplicon', 450, '100000.00', 12, '1.0000', 450, 1200000, '1.20', '3.4241', '0.10', '6.02', '2025-02-27 10:20:42', 'NGS-25-AP-AV-AX-AY');

-- --------------------------------------------------------

--
-- Table structure for table `nlp_data`
--

CREATE TABLE `nlp_data` (
  `id` int(11) NOT NULL,
  `conc` float DEFAULT NULL,
  `avgLib` float DEFAULT NULL,
  `totalVolume` float DEFAULT NULL,
  `flowcell` varchar(10) DEFAULT NULL,
  `nM` float DEFAULT NULL,
  `pMol` int(11) DEFAULT NULL,
  `libUl` float DEFAULT NULL,
  `rsbUl` float DEFAULT NULL,
  `concCalc` float DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `nlp_data`
--

INSERT INTO `nlp_data` (`id`, `conc`, `avgLib`, `totalVolume`, `flowcell`, `nM`, `pMol`, `libUl`, `rsbUl`, `concCalc`, `timestamp`) VALUES
(5, 20, 20, 20, 'P3', 1540.83, 525, 0.0068145, 19.9932, 0.525, '2025-02-24 14:59:05'),
(6, 20, 20, 20, 'P3', 1540.83, 525, 0.0068145, 19.9932, 0.525, '2025-02-24 15:42:25'),
(7, 1, 587, 70, 'P1', 2.62493, 700, 18.6672, 51.3328, 0.7, '2025-02-24 20:35:25'),
(11, 20, 20, 20, 'P3', 1540.83, 525, 0.0068145, 19.9932, 0.525, '2025-03-05 12:34:08'),
(12, 20, 20, 20, 'P1', 1540.83, 700, 0.009086, 19.9909, 0.7, '2025-03-06 11:48:03');

-- --------------------------------------------------------

--
-- Table structure for table `richtlijnen`
--

CREATE TABLE `richtlijnen` (
  `no` int(11) NOT NULL,
  `type` varchar(255) NOT NULL,
  `size_bp` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `richtlijnen`
--

INSERT INTO `richtlijnen` (`no`, `type`, `size_bp`) VALUES
(1, 'DNA prep', 750),
(2, '16s/XT v2', 0),
(3, 'RNAseq', 650),
(6, 'Takara Pico v3 Kit', 1000);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `mixdiffpools`
--
ALTER TABLE `mixdiffpools`
  ADD PRIMARY KEY (`ProjectPool`);

--
-- Indexes for table `nlp_data`
--
ALTER TABLE `nlp_data`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `richtlijnen`
--
ALTER TABLE `richtlijnen`
  ADD PRIMARY KEY (`no`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `nlp_data`
--
ALTER TABLE `nlp_data`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
