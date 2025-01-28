document.getElementById("calculateButton").addEventListener("click", function () {
    // Haal de waarden op
    const project = document.getElementById("project").value.trim();
    const application = document.getElementById("application").value;
    const genomeSize = parseFloat(document.getElementById("size").value.trim());
    const coverage = parseFloat(document.getElementById("coverage").value.trim());
    const sampleCount = parseInt(document.getElementById("sampleCount").value.trim());
    const avgLibSize = parseFloat(document.getElementById("avgLibSize").value.trim());
    const concentration = parseFloat(document.getElementById("conc").value.trim());
    const cycli = parseInt(document.getElementById("cycli").value.trim()); // Haal cycli op (300 of 600)

    // Controleer of alle invoervelden geldig zijn
    if (!project || isNaN(genomeSize) || isNaN(coverage) || isNaN(sampleCount) || isNaN(avgLibSize) || isNaN(concentration) || isNaN(cycli)) {
        alert("Zorg ervoor dat alle velden correct zijn ingevuld!");
        return;
    }

    // Stel factor1 in op basis van het aantal cycli
    let factor1;
    if (cycli === 300) {
        factor1 = 270;
    } else if (cycli === 600) {
        factor1 = 450;
    } else {
        alert("Onbekend aantal cycli geselecteerd! Kies 300 of 600.");
        return;
    }

    // Bereken clusters op basis van de geselecteerde toepassing
    let clusters;
    switch (application) {
        case "WGS":
            clusters = (genomeSize * coverage * sampleCount) / factor1;
            break;
        case "RNAseq":
        case "Amplicon":
        case "MGX":
            clusters = coverage * sampleCount;
            break;
        default:
            alert("Onbekende toepassing geselecteerd!");
            return;
    }

    // Controleer of de berekening logisch is
    if (clusters <= 0) {
        alert("Er ging iets mis met de berekening van clusters. Controleer de ingevoerde gegevens.");
        return;
    }

    clusters = clusters.toExponential(2); // Wetenschappelijke notatie met 2 significante cijfers

    // Voeg de waarden toe aan de tabel
    const tableBody = document.querySelector("#projectTable tbody");
    const newRow = `
        <tr>
            <td><input type="checkbox"></td>
            <td>${project}</td>
            <td>${application}</td>
            <td>${clusters}</td>
            <td>${concentration}</td>
        </tr>
    `;
    tableBody.insertAdjacentHTML("beforeend", newRow);

    // Reset het formulier na toevoegen
    document.getElementById("combinedForm").reset();
});
