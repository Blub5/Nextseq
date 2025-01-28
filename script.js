// Bereken clusters en voeg project toe aan tabel
document.getElementById("calculateButton").addEventListener("click", function () {
    const project = document.getElementById("project").value.trim();
    const application = document.getElementById("application").value;
    const genomeSize = parseFloat(document.getElementById("size").value.trim());
    const coverage = parseFloat(document.getElementById("coverage").value.trim());
    const sampleCount = parseInt(document.getElementById("sampleCount").value.trim());
    const avgLibSize = parseFloat(document.getElementById("avgLibSize").value.trim());
    const concentration = parseFloat(document.getElementById("conc").value.trim());
    const cycli = parseInt(document.getElementById("cycli").value.trim());

    if (!project || isNaN(genomeSize) || isNaN(coverage) || isNaN(sampleCount) || isNaN(avgLibSize) || isNaN(concentration) || isNaN(cycli)) {
        alert("Make sure all fields are filled in correctly!");
        return;
    }

    let factor1;
    if (cycli === 300) {
        factor1 = 270;
    } else if (cycli === 600) {
        factor1 = 450;
    } else {
        alert("Unknown number of cycles selected! Please select 300 or 600.");
        return;
    }

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
            alert("Unknown application selected.");
            return;
    }

    if (clusters <= 0) {
        alert("Something went wrong with the calculation of clusters. Please check the data entered.");
        return;
    }

    clusters = clusters.toExponential(2);

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

    document.getElementById("combinedForm").reset();
});

// Bereken Flowcell
document.getElementById("calculateFlowcellButton").addEventListener("click", function () {
    const rows = Array.from(document.querySelectorAll("#projectTable tbody tr"));

    if (rows.length === 0) {
        alert("There are no projects in the table to calculate!");
        return;
    }

    const selectedRows = rows.filter(row => row.querySelector("td:first-child input").checked);

    if (selectedRows.length === 0) {
        alert("Select at least one project!");
        return;
    }

    let totalClusters = 0;
    selectedRows.forEach(row => {
        const clusters = parseFloat(row.querySelector("td:nth-child(4)").textContent);
        totalClusters += clusters;
    });

    let flowcellCapacity, flowcellType;
    if (totalClusters <= 100e6) {
        flowcellCapacity = 100e6;
        flowcellType = "P1";
    } else if (totalClusters <= 400e6) {
        flowcellCapacity = 400e6;
        flowcellType = "P2";
    } else if (totalClusters <= 1200e6) {
        flowcellCapacity = 1200e6;
        flowcellType = "P3";
    } else if (totalClusters <= 1800e6) {
        flowcellCapacity = 1800e6;
        flowcellType = "P4";
    } else {
        alert("The total clusters exceed the maximum capacity of P4 (1.8B clusters).");
        return;
    }

    const percentageFilled = (totalClusters / flowcellCapacity) * 100;

    // Controleer of de flowcell boven 90% gevuld is
    let warningMessage = "";
    if (percentageFilled > 90) {
        warningMessage = `<p style="color: red;">Warning: The ${flowcellType} flowcell is filled above 90%x(${percentageFilled.toFixed(2)}%).</p>`;
    }

    // Update de totale clusters en het percentage
    document.getElementById("flowcellOutput").innerHTML = `
        <p>Total clusters(Selected projectpools): ${totalClusters.toExponential(2)}</p>
        <p>${flowcellType} capacity: ${percentageFilled.toFixed(2)}% filled</p>
        ${warningMessage}
    `;
});
