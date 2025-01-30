document.getElementById("calculateButton").addEventListener("click", function () {
    let valid = true;

    // Validate all input fields
    document.querySelectorAll("#combinedForm input").forEach(input => {
        const errorMsg = input.nextElementSibling;
        if (input.value.trim() === "") {
            valid = false;
            input.style.borderColor = "red";
            if (errorMsg) {
                errorMsg.style.display = "block";
                errorMsg.textContent = "This field is required.";
            }
        } else {
            input.style.borderColor = "#ccc";
            if (errorMsg) errorMsg.style.display = "none";
        }
    });

    if (!valid) return;

    // Get input values
    const project = document.getElementById("project").value.trim();
    const application = document.getElementById("application").value;
    const genomeSize = parseFloat(document.getElementById("size").value);
    const coverage = parseFloat(document.getElementById("coverage").value);
    const sampleCount = parseInt(document.getElementById("sampleCount").value);
    const cycli = parseInt(document.getElementById("cycli").value);

    // Check if the project already exists in the table
    const existingProjects = [...document.querySelectorAll("#projectTable tbody tr td:nth-child(2)")].map(td => td.textContent);
    if (existingProjects.includes(project)) {
        alert(`ProjectPool "${project}" already exists! Choose a different name.`);
        return;
    }

    // Calculate clusters
    let clusters = (application === "WGS") ? 
        (genomeSize * coverage * sampleCount) / (cycli === 300 ? 270 : 450) :
        coverage * sampleCount;

    clusters = clusters.toExponential(2);

    // Create a new row
    const newRow = document.createElement("tr");
    newRow.innerHTML = `
        <td><input type="checkbox"></td>
        <td>${project}</td>
        <td>${application}</td>
        <td>${clusters} <button class="delete-row-btn">X</button></td> <!-- X delete button -->
    `;

    // Append new row to table
    document.querySelector("#projectTable tbody").appendChild(newRow);

    // Attach event listener to the "X" delete button
    newRow.querySelector(".delete-row-btn").addEventListener("click", function () {
        newRow.remove();
    });

    // Reset form after submission
    document.getElementById("combinedForm").reset();
});
