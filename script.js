// Add this at the beginning of script.js
let projectPoolCounter = 1;

function getSettings() {
    const savedSettings = JSON.parse(localStorage.getItem('mixdiffpoolsSettings'));
    return savedSettings || {
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
}

// Define which fields are user-editable and required for calculation
const userEditableFields = [
    'ProjectPool',
    'Application',
    'GenomeSize',
    'Coverage',
    'SampleCount',
    'Conc',
    'AvgLibSize'
];

// Required fields for calculation
const requiredFields = [
    'Application',
    'GenomeSize',
    'Coverage',
    'SampleCount'
];

// Array of colors for different project pools
const poolColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEEAD', '#D4A5A5', '#9EC1CF', '#CC99C9',
    '#F7A072', '#B2B1CF', '#66CC99', '#F9DC5C',
    '#F28C28', '#2980B9', '#27AE60', '#8E44AD'
  ];
  
// Helper function to generate consistent colors based on ProjectPool name
function getColorForProjectPool(projectPool) {
    let hash = 0;
    for (let i = 0; i < projectPool.length; i++) {
        hash = projectPool.charCodeAt(i) + ((hash << 5) - hash);
    }
    return poolColors[Math.abs(hash) % poolColors.length];
}

// Helper function to parse exponential notation safely
function parseNumber(value) {
    if (typeof value === 'string' && value.includes('e')) {
        return parseFloat(value);
    }
    return Number(value);
}

// Helper function to parse percentage values
function parsePercentage(value) {
    if (typeof value === 'string') {
        value = value.replace('%', '');
        return parseFloat(value) || 0;
    }
    return value || 0;
}

// Helper function to get precise value for calculations
function getPreciseValue(input) {
    if (!input) return 0;
    return input.dataset.preciseValue ? parseFloat(input.dataset.preciseValue) : parseFloat(input.value);
}

// Function to check and calculate row values
function checkAndCalculate(row) {
    if (!row) return;
    
    const conc = getInputValue(row, 'Conc');
    const avgLibSize = getInputValue(row, 'AvgLibSize');
    
    if (conc > 0 && avgLibSize > 0) {
        const nM = calculateNM(avgLibSize, conc);
        const nMInput = row.querySelector('[data-field="nM"]');
        if (nMInput) {
            nMInput.dataset.preciseValue = nM.toString();
            nMInput.value = parseFloat(nM).toFixed(1);
        }
    }
    
    if (areRequiredFieldsFilled(row)) {
        const application = getInputValue(row, 'Application');
        const genomeSize = getInputValue(row, 'GenomeSize');
        const coverage = getInputValue(row, 'Coverage');
        const sampleCount = getInputValue(row, 'SampleCount');
        
        const clusters = calculateClusters(application, genomeSize, coverage, sampleCount);
        const clustersInput = row.querySelector('[data-field="Clusters"]');
        if (clustersInput) {
            clustersInput.dataset.preciseValue = clusters.toString();
            clustersInput.value = clusters.toExponential(2);
        }
    }

    updateFlowcellAndPercentage();
}

// Function to calculate nM with precise values
function calculateNM(avgLibSize, conc) {
    return (conc * 1000000) / (649 * avgLibSize);
}

// Function to determine the appropriate Flowcell based on total clusters
function determineFlowcell(totalClusters) {
    const flowcells = getSettings().flowcells;
    if (totalClusters <= flowcells.P1) return 'P1';
    if (totalClusters <= flowcells.P2) return 'P2';
    if (totalClusters <= flowcells.P3) return 'P3';
    return 'P4';
}

// Updated updateFlowcellAndPercentage function with precise calculations
function updateFlowcellAndPercentage() {
    const rows = document.querySelectorAll('#spreadsheetTable tbody tr');
    
    // Calculate total clusters using precise values
    const totalClusters = Array.from(rows).reduce((sum, row) => {
        const clustersInput = row.querySelector('[data-field="Clusters"]');
        const preciseValue = clustersInput?.dataset.preciseValue;
        return sum + (preciseValue ? parseFloat(preciseValue) : 0);
    }, 0);
    
    const overallFlowcell = determineFlowcell(totalClusters);
    const flowcellMax = getSettings().flowcells[overallFlowcell];

    // Update flowcell output display
    const flowcellOutput = document.getElementById('flowcellOutput');
    flowcellOutput.textContent = `Current Flowcell: ${overallFlowcell}`;

    // Update column header
    const percentageHeader = document.querySelector('#spreadsheetTable th[data-field="%(Flowcell)"]');
    if (percentageHeader) {
        percentageHeader.textContent = `%${overallFlowcell}`;
    }

    // First pass: calculate precise values
    const rowCalculations = Array.from(rows).map(row => {
        const clustersInput = row.querySelector('[data-field="Clusters"]');
        const clusters = clustersInput?.dataset.preciseValue ? parseFloat(clustersInput.dataset.preciseValue) : 0;
        const sampleCount = getInputValue(row, 'SampleCount');
        
        // Calculate precise percentages
        const percentageOfFlowcellMax = (clusters * 100) / flowcellMax;
        const percentagePerSample = sampleCount > 0 ? (clusters * 100) / (sampleCount * flowcellMax) : 0;
        
        return {
            row,
            clusters,
            percentageOfFlowcellMax,
            percentagePerSample
        };
    });

    // Calculate totalPercentagePerSample and totalNM for UI NGS Pool calculation
    const totalPercentagePerSample = rowCalculations.reduce((sum, { percentagePerSample }) => sum + percentagePerSample, 0);
    const totalNM = rowCalculations.reduce((sum, { row }) => sum + getPreciseValue(row.querySelector('[data-field="nM"]')), 0);
    const totalProduct = totalPercentagePerSample * totalNM;

    // Second pass: Update displays and calculate UI NGS Pool
    let totalUlNgsPool = 0;

    rowCalculations.forEach(({ row, percentageOfFlowcellMax, percentagePerSample }) => {
        // Update %Flowcell
        const percentFlowcellInput = row.querySelector('[data-field="%(Flowcell)"]');
        if (percentFlowcellInput) {
            percentFlowcellInput.dataset.preciseValue = percentageOfFlowcellMax.toString();
            percentFlowcellInput.value = parseFloat(percentageOfFlowcellMax).toFixed(1) + '%';
        }
        
        // Update %Sample per Flowcell
        const percentSampleInput = row.querySelector('[data-field="%Sample per (Flowcell)"]');
        if (percentSampleInput) {
            percentSampleInput.dataset.preciseValue = percentagePerSample.toString();
            percentSampleInput.value = parseFloat(percentagePerSample).toFixed(1) + '%';
        }

        // Calculate and update UI NGS Pool
        if (totalProduct > 0) {
            const settings = getSettings();
            const uiNgsPool = (percentagePerSample * 
                              settings.poolSettings.basePoolVolume * 
                              settings.poolSettings.expectedNM) / totalProduct;
            const uiNgsPoolInput = row.querySelector('[data-field="UI NGS Pool"]');
            if (uiNgsPoolInput) {
                uiNgsPoolInput.dataset.preciseValue = uiNgsPool.toString();
                uiNgsPoolInput.value = parseFloat(uiNgsPool).toFixed(1);
            }
            totalUlNgsPool += parseFloat(uiNgsPool);
        }
    });

    // Update progress bar and visualization
    updateProgressBarAndLegend(rowCalculations, flowcellMax);

    // Calculate and update Tris value
    const trisToAdd = getSettings().poolSettings.basePoolVolume - totalUlNgsPool;
    const trisOutput = document.getElementById('trisOutput');
    trisOutput.textContent = `ul Tris aan pool toevoegen: ${parseFloat(trisToAdd).toFixed(1)}`;
}

// Function to update progress bar and legend
function updateProgressBarAndLegend(rowCalculations, flowcellMax) {
    const progressBar = document.querySelector('.progress-bar');
    const legendContainer = document.getElementById('progressLegend');
    const progressPercentage = document.getElementById('progressPercentage');
    
    progressBar.innerHTML = '';
    legendContainer.innerHTML = '';

    const projectPools = new Map();
    rowCalculations.forEach(({ row, clusters }) => {
        const projectPool = row.querySelector('[data-field="ProjectPool"]').value;
        if (projectPool && clusters > 0) {
            if (projectPools.has(projectPool)) {
                projectPools.get(projectPool).clusters += clusters;
            } else {
                projectPools.set(projectPool, {
                    clusters,
                    color: getColorForProjectPool(projectPool)
                });
            }
        }
    });

    const sortedPools = Array.from(projectPools.entries())
        .sort((a, b) => b[1].clusters - a[1].clusters);

    let totalPercentage = 0;
    sortedPools.forEach(([projectPool, data]) => {
        const percentage = (data.clusters / flowcellMax) * 100;
        
        if (percentage > 0) {
            const segment = document.createElement('div');
            segment.className = 'progress-segment';
            segment.style.width = `${percentage}%`;
            segment.style.backgroundColor = data.color;
            segment.title = `${projectPool}: ${parseFloat(percentage).toFixed(1)}%`;
            progressBar.appendChild(segment);

            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <div class="legend-color" style="background-color: ${data.color}"></div>
                <span>${projectPool} (${parseFloat(percentage).toFixed(1)}%)</span>
            `;
            legendContainer.appendChild(legendItem);
        }
        
        totalPercentage += percentage;
    });

    progressPercentage.textContent = `${parseFloat(totalPercentage).toFixed(1)}%`;
    progressPercentage.style.color = totalPercentage > 90 ? '#FF4444' : 
                                   totalPercentage > 70 ? '#FFA500' : '#FFFFFF';
}

// Function to calculate clusters based on application type
function calculateClusters(application, genomeSize, coverage, sampleCount) {
    const settings = getSettings();
    const adjustedCycli = settings.applicationSettings.cycli * 0.9; // Reduce cycli by 10%
    console.log("Adjusted cycli used for calculations:", adjustedCycli);
    
    switch(application) {
        case 'WGS':
            return (genomeSize * coverage * sampleCount) / adjustedCycli;
        case 'RNAseq':
        case 'Amplicon':
        case 'MGX':
            return coverage * sampleCount;
        default:
            return 0;
    }
}

// Function to get input value and convert to number
function getInputValue(row, fieldName) {
    const input = row.querySelector(`[data-field="${fieldName}"]`);
    if (!input) return 0;
    
    if (input.type === 'select-one') {
        return input.value;
    }
    
    const value = input.value.trim();
    return value.endsWith('%') ? parsePercentage(value) : (value === '' ? 0 : parseNumber(value));
}

// Function to check if all required fields are filled
function areRequiredFieldsFilled(row) {
    return requiredFields.every(field => {
        const input = row.querySelector(`[data-field="${field}"]`);
        return input && input.value && input.value.trim() !== '';
    });
}

// Function to create a cell with appropriate input type
function createCell(fieldName, isEditable) {
    const td = document.createElement('td');
    
    if (fieldName === 'ProjectPool') {
        const input = document.createElement('input');
        input.type = 'text';
        input.dataset.field = fieldName;
        input.readOnly = true;
        input.style.backgroundColor = '#f0f0f0';
        input.style.color = '#666';
        const settings = getSettings();
        const prefix = settings.projectPoolSettings?.prefix || 'NGS-';
        input.value = `${prefix}${projectPoolCounter++}`;
        td.appendChild(input);
    } else if (fieldName === 'Application') {
        const select = document.createElement('select');
        select.dataset.field = fieldName;
        const options = ['WGS', 'RNAseq', 'Amplicon', 'MGX'];

        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'Selecteer...';
        select.appendChild(emptyOption);

        options.forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option;
            optElement.textContent = option;
            select.appendChild(optElement);
        });

        select.addEventListener('change', function() {
            checkAndCalculate(this.closest('tr'));
        });
        td.appendChild(select);
    } else if (isEditable) {
        const input = document.createElement('input');
        input.type = 'text';
        input.dataset.field = fieldName;
        input.placeholder = 'Vul in...';

        input.addEventListener('input', function() {
            checkAndCalculate(this.closest('tr'));
        });

        td.appendChild(input);
    } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.dataset.field = fieldName;
        input.placeholder = 'Automatisch...';
        input.readOnly = true;
        input.style.backgroundColor = '#f0f0f0';
        input.style.color = '#666';
        td.appendChild(input);
    }
    
    return td;
}
function reorderProjectPools() {
    const rows = document.querySelectorAll('#spreadsheetTable tbody tr');
    const settings = getSettings();
    const prefix = settings.projectPoolSettings?.prefix || 'NGS-';
    
    rows.forEach((row, index) => {
        const projectPoolInput = row.querySelector('[data-field="ProjectPool"]');
        if (projectPoolInput) {
            projectPoolInput.value = `${prefix}${index + 1}`;
        }
    });
    
    projectPoolCounter = rows.length + 1;
}

// Function to add a new row to the table
function addRow() {
    const tbody = document.querySelector('#spreadsheetTable tbody');
    const newRow = document.createElement('tr');

    const headers = [
        'ProjectPool',
        'Application',
        'GenomeSize',
        'Coverage',
        'SampleCount',
        'Conc',
        'AvgLibSize',
        'Clusters',
        '%(Flowcell)',
        'nM',
        '%Sample per (Flowcell)',
        'UI NGS Pool'
    ];

    headers.forEach((header) => {
        const isEditable = userEditableFields.includes(header);
        const cell = createCell(header, isEditable);
        newRow.appendChild(cell);
    });

    const tdAction = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Verwijder';
    delBtn.className = 'removeButton';
    delBtn.addEventListener('click', function() {
        tbody.removeChild(newRow);
        updateFlowcellAndPercentage();
        reorderProjectPools();
    });
    tdAction.appendChild(delBtn);
    newRow.appendChild(tdAction);

    tbody.appendChild(newRow);
    updateFlowcellAndPercentage();
}

// Initialize the table
document.addEventListener('DOMContentLoaded', function() {
    addRow();
    document.getElementById('addRowButton').addEventListener('click', addRow);
});