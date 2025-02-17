document.addEventListener('DOMContentLoaded', function () {
    const calculateBtn = document.getElementById('calculateBtn');
    const resultsTable = document.getElementById('resultsTable');

    calculateBtn.addEventListener('click', function () {
        // Verkrijg invoerwaarden
        const conc = parseFloat(document.getElementById('conc').value) || 0;
        const avgLib = parseFloat(document.getElementById('avgLib').value) || 0;
        const totalVolume = parseFloat(document.getElementById('totalVolume').value) || 0;
        const flowcell = document.getElementById('flowcell').value;

        // Validatie van invoer
        if (!conc || !avgLib || !totalVolume) {
            alert('Vul alle vereiste velden in');
            return;
        }

        // Berekening van nM
        const nM = (conc * 1000000) / (649 * avgLib);

        // Stel pMol in op basis van flowcell
        const pMol = ['P1', 'P2'].includes(flowcell) ? 700 : 525;

        // Berekening van library volume (μL)
        const libUl = (totalVolume * pMol) / (nM * 1000);

        // Berekening van RSB volume (μL)
        const rsbUl = totalVolume - libUl;

        // Berekening van Conc calc
        let concCalc = (libUl * nM) / totalVolume;

        // Controleer of de berekende waarde overeenkomt met pMol
        if (Math.abs((concCalc * 1000) - pMol) < 0.5) {  
            concCalc = concCalc.toFixed(3);
        } else {
            concCalc = "error"; 
        }

        // Resultaten weergeven in de tabel
        document.getElementById('nMResult').textContent = nM.toFixed(1);
        document.getElementById('pMolResult').textContent = pMol;
        document.getElementById('libUlResult').textContent = libUl.toFixed(1);
        document.getElementById('rsbUlResult').textContent = rsbUl.toFixed(1);
        document.getElementById('concCalcResult').textContent = concCalc;

        // Toon resultaten in de tabel
        resultsTable.style.display = 'block';
    });

    // Input validatie voor getallen
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
