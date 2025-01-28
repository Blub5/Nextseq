document.addEventListener("DOMContentLoaded", () => {
    const calculateButton = document.getElementById("calculateButton");
    const calculateFlowcellButton = document.getElementById("calculateFlowcellButton");
    const projectTableBody = document.querySelector("#projectTable tbody");
    const flowcellOutput = document.getElementById("flowcellOutput");

    const projectSet = new Set(); // Houd bij welke projectpools al zijn toegevoegd.

    // Berekening en toevoegen aan tabel
    calculateButton.addEventListener("click", () => {
        const project = document.getElementById("project").value.trim();
        const application = document.getElementById("application").value;
        const size = parseFloat(document.getElementById("size").value);
        const coverage = parseFloat(document.getElementById("coverage").value);
        const sampleCount = parseInt(document.getElementById("sampleCount").value, 10);
        const conc = parseFloat(document.getElementById("conc").value);
        const avgLibSize = parseFloat(document.getElementById("avgLibSize").value);
        const cycli = parseInt(document.getElementById("cycli").value, 10);

        if (!project || isNaN(size) || isNaN(coverage) || isNaN(sampleCount) || isNaN(conc) || isNaN(avgLibSize)) {
            alert("Vul alle velden correct in.");
            return;
        }

        if (projectSet.has(project)) {
            alert("Dit project bestaat al in de tabel.");
            return;
        }

        const factor = cycli === 300 ? 270 : 450;
        const clusters =
            application === "WGS"
                ? (size * coverage * sampleCount) / factor
                : coverage * sampleCount;

        const nM = (conc * 1000) / (649 * avgLibSize) * 1000;

        // Rij toevoegen aan tabel
        const newRow = document.createElement("tr");
        newRow.innerHTML = `
            <td><input type="checkbox" class="rowSelector"></td>
            <td>${project}</td>
            <td>${application}</td>
            <td>${clusters.toExponential(2)}</td>
            <td>${nM.toFixed(1)}</td>
        `;
        projectTableBody.appendChild(newRow);

        // Voeg project toe aan de set
        projectSet.add(project);

        // Velden leegmaken
        document.getElementById("project").value = "";
    });

    // Flowcell-berekening
    calculateFlowcellButton.addEventListener("click", () => {
        const selectedRows = document.querySelectorAll(".rowSelector:checked");

        if (selectedRows.length === 0) {
            flowcellOutput.textContent = "Selecteer ten minste één project.";
            return;
        }

        const flowcellCapacity = 1100000000; // Capaciteit van een enkele flowcell
        let totalClusters = 0;
        let flowcellMapping = {};

        selectedRows.forEach((row, index) => {
            const clustersCell = row.parentElement.parentElement.cells[3];
            const clusters = parseFloat(clustersCell.textContent);
            totalClusters += clusters;

            // Bereken de flowcell per cluster
            const flowcellNumber = Math.floor(totalClusters / flowcellCapacity) + 1;
            const flowcellName = `P${flowcellNumber}`;

            if (!flowcellMapping[flowcellName]) {
                flowcellMapping[flowcellName] = 0;
            }
            flowcellMapping[flowcellName] += clusters;
        });

        // Genereer output
        const flowcellDetails = Object.entries(flowcellMapping)
            .map(([flowcell, clusters]) => `${flowcell}: ${clusters.toExponential(2)} clusters`)
            .join(" | ");

        flowcellOutput.textContent = `Totale clusters: ${totalClusters.toExponential(
            2
        )} | Flowcell verdeling: ${flowcellDetails}`;
    });
});
