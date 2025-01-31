document.addEventListener("DOMContentLoaded", function () {
    fetch("fetch_data.php")
        .then(response => {
            if (!response.ok) throw new Error("Network error");
            return response.json();
        })
        .then(data => {
            const tableBody = document.querySelector("#projectTable tbody");
            tableBody.innerHTML = "";

            data.forEach(project => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${project.project}</td>
                    <td>${project.application}</td>
                    <td>${project.clusters}</td>
                    <td>${project.flowcell || 'N/A'}</td>
                `;
                tableBody.appendChild(row);
            });

            document.getElementById("loadingMessage").style.display = "none";
        })
        .catch(error => {
            console.error("Error fetching data:", error);
            document.getElementById("errorMessage").style.display = "block";
            document.getElementById("loadingMessage").style.display = "none";
        });
});