document.addEventListener('DOMContentLoaded', function () {
    const calculateBtn = document.getElementById('calculateBtn');
    const resultsTable = document.getElementById('resultsTable');

    calculateBtn.addEventListener('click', function () {
        // Get input values
        const conc = parseFloat(document.getElementById('conc').value) || 0;
        const avgLib = parseFloat(document.getElementById('avgLib').value) || 0;
        const totalVolume = parseFloat(document.getElementById('totalVolume').value) || 0;
        const flowcell = document.getElementById('flowcell').value;

        // Validation
        if (!conc || !avgLib || !totalVolume) {
            alert('Vul alle vereiste velden in');
            return;
        }

        // Calculate nM (Nanomolarity)
        // Formula: nM = (Conc × 10^3) / (649 × Avg Lib Size) × 1000
        const nM = (conc * 1000) / (649 * avgLib) * 1000;

        // Calculate pMol based on flowcell
        // For P3/P4: 700 × 0.75 = 525
        // For P1/P2: 700
        let pMol;
        if (flowcell === 'P1' || flowcell === 'P2') {
            pMol = 700;
        } else if (flowcell === 'P3' || flowcell === 'P4') {
            pMol = 525; // 700 × 0.75
        }

        // Calculate library volume (μL)
        const libUl = (totalVolume * pMol) / (nM * 1000);

        // Calculate RSB volume (μL)
        const rsbUl = totalVolume - libUl;

        // Calculate Conc calc
        // Formula: Conc calc = pMol / 1000
        const concCalc = pMol / 1000;

        // Display results in table
        document.getElementById('nMResult').textContent = nM.toFixed(3);
        document.getElementById('pMolResult').textContent = pMol;
        document.getElementById('libUlResult').textContent = libUl.toFixed(1);
        document.getElementById('rsbUlResult').textContent = rsbUl.toFixed(1);
        document.getElementById('concCalcResult').textContent = concCalc.toFixed(3);

        // Show results table
        resultsTable.style.display = 'block';
    });

    // Input validation for numbers
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        input.addEventListener('input', function () {
            this.value = this.value.replace(/[^\d.-]/g, '');
            const decimalCount = (this.value.match(/\./g) || []).length;
            if (decimalCount > 1) {
                this.value = this.value.replace(/\.+$/, '');
            }
        });
    });
});