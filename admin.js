// Default values
const defaultSettings = {
    flowcells: {
        P1: 100000000,
        P2: 400000000,
        P3: 1200000000,
        P4: 1800000000
    },
    poolSettings: {
        basePoolVolume: 50,
        expectedNM: 3
    },
    applicationSettings: {
        cycli: 270
    },
    projectPoolSettings: {
        prefix: 'NGS-'
    }
};

// Load settings when the page loads
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    
    // Add event listener for save button
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
});

// Function to load settings from localStorage
function loadSettings() {
    const savedSettings = JSON.parse(localStorage.getItem('mixdiffpoolsSettings')) || defaultSettings;
    
    // Flowcell capacities
    document.getElementById('p1-capacity').value = savedSettings.flowcells.P1;
    document.getElementById('p2-capacity').value = savedSettings.flowcells.P2;
    document.getElementById('p3-capacity').value = savedSettings.flowcells.P3;
    document.getElementById('p4-capacity').value = savedSettings.flowcells.P4;
    
    // Pool settings
    document.getElementById('base-pool-volume').value = savedSettings.poolSettings.basePoolVolume;
    document.getElementById('expected-nm').value = savedSettings.poolSettings.expectedNM;
    
    // Application settings
    document.getElementById('cycli').value = savedSettings.applicationSettings.cycli;

    // ProjectPool settings
    document.getElementById('projectpool-prefix').value = savedSettings.projectPoolSettings?.prefix || defaultSettings.projectPoolSettings.prefix;
}

// Function to save settings to localStorage
function saveSettings() {
    const settings = {
        flowcells: {
            P1: parseInt(document.getElementById('p1-capacity').value),
            P2: parseInt(document.getElementById('p2-capacity').value),
            P3: parseInt(document.getElementById('p3-capacity').value),
            P4: parseInt(document.getElementById('p4-capacity').value)
        },
        poolSettings: {
            basePoolVolume: parseInt(document.getElementById('base-pool-volume').value),
            expectedNM: parseFloat(document.getElementById('expected-nm').value)
        },
        applicationSettings: {
            cycli: parseInt(document.getElementById('cycli').value)
        },
        projectPoolSettings: {
            prefix: document.getElementById('projectpool-prefix').value || defaultSettings.projectPoolSettings.prefix
        }
    };

    // Validate settings
    if (!validateSettings(settings)) {
        showMessage('Please fill in all fields with valid numbers', 'error');
        return;
    }

    // Save to localStorage
    localStorage.setItem('mixdiffpoolsSettings', JSON.stringify(settings));
    showMessage('Settings saved successfully!', 'success');
}

// Function to validate settings
function validateSettings(settings) {
    // Check flowcells
    for (let key in settings.flowcells) {
        if (!settings.flowcells[key] || isNaN(settings.flowcells[key])) return false;
    }
    
    // Check pool settings
    if (!settings.poolSettings.basePoolVolume || isNaN(settings.poolSettings.basePoolVolume)) return false;
    if (!settings.poolSettings.expectedNM || isNaN(settings.poolSettings.expectedNM)) return false;
    
    // Check application settings
    if (!settings.applicationSettings.cycli || isNaN(settings.applicationSettings.cycli)) return false;
    
    return true;
}

// Function to show message
function showMessage(message, type) {
    const messageEl = document.getElementById('saveMessage');
    messageEl.textContent = message;
    messageEl.className = `save-message ${type}`;
    
    // Show message
    messageEl.style.display = 'block';
    
    // Hide message after 3 seconds
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 3000);
}