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
            setTimeout(() => errorDiv.style.display = 'none', 5000); // Hide after 5 seconds
        } else {
            alert(message); // Fallback if div is missing
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

    inputs.forEach(input => {
        input.addEventListener('input', function() {
            this.value = validateNumericInput(this);
        });
    });

    const lastFlowcell = localStorage.getItem('lastFlowcell');
    if (lastFlowcell) {
        flowcellSelect.value = lastFlowcell;
    }

    calculateBtn.addEventListener('click', async function() {
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

            localStorage.setItem('lastFlowcell', flowcell);

            const results = calculateValues(conc, avgLib, totalVolume, flowcell);
            const inputValues = { conc, avgLib, totalVolume, flowcell };

            await updateResultsTableAndSave(results, inputValues);
        } catch (error) {
            console.error('Calculation error:', error);
            showErrorToUser(error.message);
        }
    });
});