// Constants and configurations
const CONFIG = {
    flowcells: [
        { type: "P1", capacity: 100e6 },
        { type: "P2", capacity: 400e6 },
        { type: "P3", capacity: 1200e6 },
        { type: "P4", capacity: 1800e6 }
    ],
    cycleFactors: {
        300: 270,
        600: 450
    }
};

class ClusterCalculator {
    static calculate(params) {
        const { application, genomeSize, coverage, sampleCount, cycli } = params;

        if (!CONFIG.cycleFactors[cycli]) {
            throw new Error("Invalid number of cycles");
        }
        switch (application) {
            case "WGS":
                return (genomeSize * coverage * sampleCount) / CONFIG.cycleFactors[cycli];
            case "RNAseq":
            case "Amplicon":
            case "MGX":
                return coverage * sampleCount;
            default:
                throw new Error("Unknown application");
        }
    }
}

class UIManager {
    static showError(message, duration = 3000) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.prepend(errorDiv);
        setTimeout(() => errorDiv.remove(), duration);
    }

    static showLoading(show = true) {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = show ? 'block' : 'none';
        }
    }

    static updateFlowcellOutput(clusters) {
        const recommendedFlowcell = CONFIG.flowcells.find(fc => fc.capacity >= clusters);
        let message;
        if (recommendedFlowcell) {
            const fillPercentage = (clusters / recommendedFlowcell.capacity) * 100;
            message = `Recommended Flowcell: ${recommendedFlowcell.type} (${fillPercentage.toFixed(2)}% full)`;
            if (fillPercentage >= 90) {
                message += " - Warning: Flowcell is over 90% full!";
            }
        } else {
            message = "Clusters exceed maximum flowcell capacity";
        }

        document.getElementById("flowcellOutput").textContent = message;
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('combinedForm');
    const calculateButton = document.getElementById('calculateButton');
    const calculateFlowcellButton = document.getElementById('calculateFlowcellButton');
    const submitButton = document.getElementById('submitToDatabase');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    if (calculateButton) {
        calculateButton.addEventListener('click', handleCalculateClick);
    }
    if (calculateFlowcellButton) {
        calculateFlowcellButton.addEventListener('click', handleFlowcellCalculation);
    }
    if (submitButton) {
        submitButton.addEventListener('click', handleDatabaseSubmit);
    }
    document.querySelector("#projectTable").addEventListener('click', handleRemoveButtonClick);
});

// Event Handlers
async function handleFormSubmit(e) {
    e.preventDefault();
    try {
        const formData = getFormData();
        validateFormData(formData);

        const clusters = ClusterCalculator.calculate(formData);
        addProjectToTable(formData, clusters);

        document.getElementById('combinedForm').reset();
        document.getElementById("project").focus();
    } catch (error) {
        UIManager.showError(error.message);
    }
}

async function handleDatabaseSubmit() {
    try {
        UIManager.showLoading(true);

        const selectedProjects = getSelectedProjects();
        if (selectedProjects.length === 0) {
            throw new Error("Please select at least one project");
        }

        const csrfTokenElement = document.getElementById('csrf_token');
        if (!csrfTokenElement) {
            throw new Error("CSRF token not found");
        }

        const response = await submitToDatabase(selectedProjects, csrfTokenElement.value);
        if (response.success) {
            window.location.href = 'mixdiffpools2.html';
        } else {
            throw new Error(response.message);
        }
    } catch (error) {
        UIManager.showError(error.message);
    } finally {
        UIManager.showLoading(false);
    }
}

function handleCalculateClick(e) {
    e.preventDefault();
    try {
        const formData = getFormData();
        validateFormData(formData);

        const clusters = ClusterCalculator.calculate(formData);
        addProjectToTable(formData, clusters);

        document.getElementById('combinedForm').reset();
        document.getElementById("project").focus();
    } catch (error) {
        UIManager.showError(error.message);
    }
}

function handleFlowcellCalculation() {
    try {
        const selectedProjects = getSelectedProjects();
        if (selectedProjects.length === 0) {
            throw new Error("Please select at least one project");
        }

        let totalClusters = 0;
        selectedProjects.forEach(project => {
            totalClusters += parseFloat(project.clusters);
        });

        UIManager.updateFlowcellOutput(totalClusters);
    } catch (error) {
        UIManager.showError(error.message);
    }
}

function handleRemoveButtonClick(e) {
    if (e.target.classList.contains('removeButton')) {
        const row = e.target.closest('tr');
        row.remove();
    }
}

// Helper Functions
function getFormData() {
    const getValue = id => document.getElementById(id).value.trim();

    return {
        project: getValue('project'),
        application: getValue('application'),
        genomeSize: parseFloat(getValue('size')),
        coverage: parseFloat(getValue('coverage')),
        sampleCount: parseInt(getValue('sampleCount')),
        avgLibSize: parseFloat(getValue('avgLibSize')),
        concentration: parseFloat(getValue('conc')),
        cycli: parseInt(getValue('cycli'))
    };
}

function validateFormData(data) {
    if (!data.project || !data.application || isNaN(data.genomeSize) || isNaN(data.coverage) || isNaN(data.sampleCount) || isNaN(data.avgLibSize) || isNaN(data.concentration) || isNaN(data.cycli)) {
        throw new Error("Please fill all fields correctly");
    }
}

function addProjectToTable(formData, clusters) {
    const tableBody = document.querySelector("#projectTable tbody");
    const row = document.createElement("tr");
    row.innerHTML = `
        <td><input type="checkbox" name="selectProject"></td>
        <td>${formData.project}</td>
        <td>${formData.application}</td>
        <td>${clusters.toExponential(2)}</td>
        <td><button type="button" class="removeButton">Remove</button></td>
    `;
    tableBody.appendChild(row);
}

function getSelectedProjects() {
    const selectedProjects = [];
    const rows = document.querySelectorAll("#projectTable tbody tr");
    rows.forEach(row => {
        const checkbox = row.querySelector('input[name="selectProject"]');
        if (checkbox && checkbox.checked) {
            const project = {
                project: row.cells[1].textContent,
                application: row.cells[2].textContent,
                clusters: row.cells[3].textContent
            };
            selectedProjects.push(project);
        }
    });
    return selectedProjects;
}

async function submitToDatabase(projects, csrfToken) {
    const response = await fetch('Submit.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded', // Match server expectations
      },
      body: new URLSearchParams({
        projects: JSON.stringify(projects),
        csrf_token: csrfToken
      })
    });
    // ... rest of the code
  }

    try {
        const response = await fetch('Submit.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Network response was not OK');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message);
        }

        return result;
    } catch (error) {
        console.error('Error submitting data:', error);
        UIManager.showError(error.message);
        throw error;
    }
