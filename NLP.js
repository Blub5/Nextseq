document.getElementById('calculateBtn').addEventListener('click', function () {
    const conc = parseFloat(document.getElementById('conc').value);
    const avgLib = parseFloat(document.getElementById('avgLib').value);

    if (isNaN(conc) || isNaN(avgLib)) {
        document.getElementById('result').textContent = 'Voer geldige waarden in.';
        return;
    }

    const nM = (conc * 1000000) / (649 * avgLib);
    const resultText = `De berekende concentratie is: ${nM.toFixed(2)} nM`;
    document.getElementById('result').textContent = resultText;
});