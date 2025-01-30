document.getElementById("calculateButton").addEventListener("click", function () {
    let valid = true;

    // Validate all input fields
    document.querySelectorAll("#combinedForm input").forEach(input => {
        const errorMsg = input.nextElementSibling;
        if (input.value.trim() === "") {
            valid = false;
            input.style.borderColor = "red";
            errorMsg.style.display = "block";
            errorMsg.textContent = "This field is required.";
        } else {
            input.style.borderColor = "#ccc";
            errorMsg.style.display = "none";
        }
    });

    if (!valid) return;

    // Get input values
    const project = document.getElementById("project").value.trim();
    const application = document.getElementById("application").value;
    const genomeSize = parseFloat(document.getElementById("size").value);
    const coverage = parseFloat(document.getElementById("coverage").value);
    const sampleCount = parseInt(document.getElementById("sampleCount").value);
    const concentration = parseFloat(document.getElementById("conc").value);
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

    // Add new row to table
    document.querySelector("#projectTable tbody").insertAdjacentHTML("beforeend", `
        <tr>
            <td><input type="checkbox"></td>
            <td>${project}</td>
            <td>${application}</td>
            <td>${clusters}</td>
        </tr>
    `);

    // Reset form after submission
    document.getElementById("combinedForm").reset();
});
