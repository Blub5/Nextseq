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
        const message = recommendedFlowcell 
            ? `Recommended Flowcell: ${recommendedFlowcell.type}` 
            : "Clusters exceed maximum flowcell capacity";
        
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
});

// Event Handlers
async function handleFormSubmit(e) {
    e.preventDefault();
    try {
        const formData = getFormData();
        validateFormData(formData);
        
        const clusters = ClusterCalculator.calculate(formData);
        addProjectToTable(formData, clusters);
        
        form.reset();
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

        const response = await submitToDatabase(selectedProjects);
        if (response.success) {
            window.location.href = 'mixdiffpools2.html';
        } else {
            throw new Error(response.message || 'Submission failed');
        }
    } catch (error) {
        UIManager.showError(error.message);
    } finally {
        UIManager.showLoading(false);
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
    if (Object.values(data).some(v => v === '' || isNaN(v))) {
        throw new Error("Please fill all fields correctly");
    }
}

async function submitToDatabase(projects) {
    const formData = new FormData();
    formData.append('projects', JSON.stringify(projects));
    formData.append('csrf_token', document.getElementById('csrf_token').value);

    const response = await fetch('submit.php', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    return response.json();
}