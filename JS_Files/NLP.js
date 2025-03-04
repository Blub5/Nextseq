document.addEventListener('DOMContentLoaded', function () {
    const calculateBtn = document.getElementById('calculateBtn');
    const resultsTable = document.getElementById('resultsTable');
    const inputs = document.querySelectorAll('input[type="number"]');
    const flowcellSelect = document.getElementById('flowcell');

    function showErrorToUser(message) {
        const errorDiv = document.getElementById('error-messages');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => errorDiv.style.display = 'none', 5000);
        } else {
            alert(message);
        }
    }

    function validateNumericInput(input) {
        let value = input.value.replace(/[^\d.-]/g, '');
        const decimalCount = (value.match(/\./g) || []).length;
        if (decimalCount > 1) {
            value = value.replace(/\.+$/, '');
        }
        if (value.split('-').length > 2) {
            value = value.replace(/-/g, '');
            if (value.length > 0) {
                value = '-' + value;
            }
        }
        return value;
    }

    function calculateValues(conc, avgLib, totalVolume, flowcell) {
        const nM = (conc * 1000) / (649 * avgLib) * 1000;
        const pMol = (flowcell === 'P1' || flowcell === 'P2') ? 700 : 525;
        const libUl = (totalVolume * pMol) / (nM * 1000);
        const rsbUl = totalVolume - libUl;
        const concCalc = pMol / 1000;
        return { nM, pMol, libUl, rsbUl, concCalc };
    }

    async function updateResultsTableAndSave(results, inputValues) {
        document.getElementById('nMResult').textContent = results.nM.toFixed(3);
        document.getElementById('pMolResult').textContent = results.pMol;
        document.getElementById('libUlResult').textContent = results.libUl.toFixed(1);
        document.getElementById('rsbUlResult').textContent = results.rsbUl.toFixed(1);
        document.getElementById('concCalcResult').textContent = results.concCalc.toFixed(3);
        resultsTable.style.display = 'block';

        const dataToSave = {
            ...inputValues,
            ...results
        };

        try {
            const response = await fetch('save_nlp_data.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSave)
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to save data');
            }
            console.log('Data saved successfully');
        } catch (error) {
            console.error('Error saving data:', error);
            showErrorToUser('Error saving data: ' + error.message);
        }
    }

    function determineFlowcell(totalClusters) {
        const flowcells = {
            P1: 100000000,
            P2: 400000000,
            P3: 1200000000,
            P4: 1800000000
        };
        if (totalClusters <= flowcells.P1) return 'P1';
        if (totalClusters <= flowcells.P2) return 'P2';
        if (totalClusters <= flowcells.P3) return 'P3';
        return 'P4';
    }

    async function fetchLatestRunFlowcell() {
        try {
            const response = await fetch('get_table_data.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    table: 'mixdiffpools',
                    sortColumn: 'timestamp',
                    sortDirection: 'desc'
                })
            });
            if (!response.ok) throw new Error(`Failed to fetch latest run: ${response.status}`);
            const result = await response.json();
            if (!result.success || !result.data || result.data.length === 0) {
                throw new Error(result.message || 'No recent run found');
            }

            // Group by RunName and sum Clusters to match the latest run
            const runs = {};
            result.data.forEach(row => {
                if (!runs[row.RunName]) {
                    runs[row.RunName] = { totalClusters: 0, timestamp: row.timestamp };
                }
                runs[row.RunName].totalClusters += parseFloat(row.Clusters) || 0;
            });

            // Find the run with the latest timestamp
            const latestRun = Object.entries(runs).reduce((latest, [runName, data]) => {
                if (!latest || new Date(data.timestamp) > new Date(latest.timestamp)) {
                    return { runName, ...data };
                }
                return latest;
            }, null);

            if (!latestRun) throw new Error('No valid run data found');
            return determineFlowcell(latestRun.totalClusters);
        } catch (error) {
            console.error('Error fetching latest flowcell:', error);
            showErrorToUser('Could not fetch latest flowcell; defaulting to P1: ' + error.message);
            return 'P1'; // Default fallback
        }
    }

    inputs.forEach(input => {
        input.addEventListener('input', function() {
            this.value = validateNumericInput(this);
        });
    });

    // Load the latest flowcell on page load
    (async () => {
        const latestFlowcell = await fetchLatestRunFlowcell();
        flowcellSelect.value = latestFlowcell;
        // Optionally disable the dropdown to prevent manual changes
        // flowcellSelect.disabled = true;
    })();

    calculateBtn.addEventListener('click', async function() {
        try {
            const conc = parseFloat(document.getElementById('conc').value);
            const avgLib = parseFloat(document.getElementById('avgLib').value);
            const totalVolume = parseFloat(document.getElementById('totalVolume').value);
            const flowcell = flowcellSelect.value; // Uses the latest run's flowcell

            if (!conc || !avgLib || !totalVolume) {
                throw new Error('Vul alle vereiste velden in');
            }
            if (conc <= 0 || avgLib <= 0 || totalVolume <= 0) {
                throw new Error('Alle waarden moeten groter zijn dan 0');
            }

            const results = calculateValues(conc, avgLib, totalVolume, flowcell);
            const inputValues = { conc, avgLib, totalVolume, flowcell };

            await updateResultsTableAndSave(results, inputValues);
        } catch (error) {
            console.error('Calculation error:', error);
            showErrorToUser(error.message);
        }
    });
});