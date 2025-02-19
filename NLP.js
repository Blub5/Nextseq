document.addEventListener('DOMContentLoaded', function () {
    const calculateBtn = document.getElementById('calculateBtn');
    const resultsTable = document.getElementById('resultsTable');
    const inputs = document.querySelectorAll('input[type="number"]');
    const flowcellSelect = document.getElementById('flowcell');
    
    // Function to validate numeric input with optional decimal point
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

    // Function to calculate nM and related values
    function calculateValues(conc, avgLib, totalVolume, flowcell) {
        const nM = (conc * 1000) / (649 * avgLib) * 1000;
        const pMol = (flowcell === 'P1' || flowcell === 'P2') ? 700 : 525;
        const libUl = (totalVolume * pMol) / (nM * 1000);
        const rsbUl = totalVolume - libUl;
        const concCalc = pMol / 1000;
        return { nM, pMol, libUl, rsbUl, concCalc };
    }

    // Function to update results table
    function updateResultsTable(results) {
        document.getElementById('nMResult').textContent = results.nM.toFixed(3);
        document.getElementById('pMolResult').textContent = results.pMol;
        document.getElementById('libUlResult').textContent = results.libUl.toFixed(1);
        document.getElementById('rsbUlResult').textContent = results.rsbUl.toFixed(1);
        document.getElementById('concCalcResult').textContent = results.concCalc.toFixed(3);
        resultsTable.style.display = 'block';
    }

    // Function to save results to database
    function saveResults(resultsData) {
        return fetch('save_nlp_data.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(resultsData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'error') {
                throw new Error(data.message);
            }
            return data;
        });
    }

    // Add input validation to all number inputs
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            this.value = validateNumericInput(this);
        });
    });

    // Retrieve the last selected flowcell from localStorage
    const lastFlowcell = localStorage.getItem('lastFlowcell');
    if (lastFlowcell) {
        flowcellSelect.value = lastFlowcell;
        console.log('Last selected flowcell:', lastFlowcell);
    }

    // Handle calculate button click
    calculateBtn.addEventListener('click', function() {
        try {
            const conc = parseFloat(document.getElementById('conc').value);
            const avgLib = parseFloat(document.getElementById('avgLib').value);
            const totalVolume = parseFloat(document.getElementById('totalVolume').value);
            const flowcell = flowcellSelect.value;

            if (!conc || !avgLib || !totalVolume) {
                throw new Error('Vul alle vereiste velden in');
            }
            if (conc <= 0 || avgLib <= 0 || totalVolume <= 0) {
                throw new Error('Alle waarden moeten groter zijn dan 0');
            }

            // Store the selected flowcell in localStorage
            localStorage.setItem('lastFlowcell', flowcell);
            console.log('lastflowcell');

            const results = calculateValues(conc, avgLib, totalVolume, flowcell);
            updateResultsTable(results);
        } catch (error) {
            console.error('Calculation error:', error);
            alert(error.message);
        }
    });
});