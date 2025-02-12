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

// Flowcell definitions with corrected P4 value
const flowcells = {
    'P1': 100000000,   
    'P2': 400000000,   
    'P3': 1200000000,  
    'P4': 1800000000   
};

// Array of colors for different project pools
const poolColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEEAD', '#D4A5A5', '#9EC1CF', '#CC99C9'
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

// Function to check and calculate row values
function checkAndCalculate(row) {
    if (!row) return;
    
    // Get concentration and average library size values
    const conc = getInputValue(row, 'Conc');
    const avgLibSize = getInputValue(row, 'AvgLibSize');
    
    // Calculate nM if both concentration and average library size are provided
    if (conc > 0 && avgLibSize > 0) {
        const nM = calculateNM(avgLibSize, conc);
        const nMInput = row.querySelector('[data-field="nM"]');
        if (nMInput) {
            nMInput.value = nM.toFixed(2);
        }
    }
    
    // Continue with clusters calculation if required fields are filled
    if (areRequiredFieldsFilled(row)) {
        const application = getInputValue(row, 'Application');
        const genomeSize = getInputValue(row, 'GenomeSize');
        const coverage = getInputValue(row, 'Coverage');
        const sampleCount = getInputValue(row, 'SampleCount');
        
        const clusters = calculateClusters(application, genomeSize, coverage, sampleCount);
        const clustersInput = row.querySelector('[data-field="Clusters"]');
        if (clustersInput) {
            clustersInput.value = clusters.toExponential(2);
        }
    }

    // Recalculate total clusters and update Flowcell and %Flowcell for all rows
    updateFlowcellAndPercentage();
}

// Helper function to calculate nM with corrected formula
function calculateNM(avgLibSize, conc) {
    // Multiply conc by 100 to get the correct scale
    return (conc * 1000000) / (649 * avgLibSize);
}

// Function to determine the appropriate Flowcell based on total clusters
function determineFlowcell(totalClusters) {
    if (totalClusters <= flowcells.P1) {
        return 'P1';
    } else if (totalClusters <= flowcells.P2) {
        return 'P2';
    } else if (totalClusters <= flowcells.P3) {
        return 'P3';
    } else {
        return 'P4';
    }
}

// Updated updateFlowcellAndPercentage function
function updateFlowcellAndPercentage() {
    const rows = document.querySelectorAll('#spreadsheetTable tbody tr');
    
    // Calculate total clusters across all rows
    const totalClusters = Array.from(rows).reduce((sum, row) => sum + getInputValue(row, 'Clusters'), 0);
    
    // Determine the overall flowcell based on total clusters
    const overallFlowcell = determineFlowcell(totalClusters);
    const flowcellMax = flowcells[overallFlowcell];

    // Update flowcell output display
    const flowcellOutput = document.getElementById('flowcellOutput');
    flowcellOutput.textContent = `Current Flowcell: ${overallFlowcell}`;

    // Get progress bar and legend elements
    const progressBar = document.querySelector('.progress-bar');
    const legendContainer = document.getElementById('progressLegend');
    
    // Clear existing content
    progressBar.innerHTML = '';
    legendContainer.innerHTML = '';

    // Group clusters by project pool
    const projectPools = new Map();
    rows.forEach((row) => {
        const projectPool = row.querySelector('[data-field="ProjectPool"]').value;
        const clusters = getInputValue(row, 'Clusters');
        
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

    // Sort project pools by size (descending)
    const sortedPools = Array.from(projectPools.entries())
        .sort((a, b) => b[1].clusters - a[1].clusters);

    // Create and append segments and legend items
    let accumulatedPercentage = 0;
    sortedPools.forEach(([projectPool, data]) => {
        const percentage = (data.clusters / flowcellMax) * 100;
        
        if (percentage > 0) {
            // Create progress segment
            const segment = document.createElement('div');
            segment.className = 'progress-segment';
            segment.style.width = `${percentage}%`;
            segment.style.backgroundColor = data.color;
            segment.title = `${projectPool}: ${percentage.toFixed(1)}%`;
            progressBar.appendChild(segment);

            // Create legend item
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <div class="legend-color" style="background-color: ${data.color}"></div>
                <span>${projectPool} (${percentage.toFixed(1)}%)</span>
            `;
            legendContainer.appendChild(legendItem);
        }
        
        accumulatedPercentage += percentage;
    });

    // Update total percentage display with warning colors
    const percentageFull = (totalClusters / flowcellMax) * 100;
    const progressPercentage = document.getElementById('progressPercentage');
    progressPercentage.textContent = `${percentageFull.toFixed(1)}%`;
    progressPercentage.style.color = percentageFull > 90 ? '#FF4444' : 
                                   percentageFull > 70 ? '#FFA500' : '#FFFFFF';

    // Update column header
    const percentageHeader = document.querySelector('#spreadsheetTable th[data-field="%(Flowcell)"]');
    if (percentageHeader) {
        percentageHeader.textContent = `%${overallFlowcell}`;
    }

    // First pass: calculate %Flowcell and %Sample per Flowcell for each row
    rows.forEach(row => {
        const clusters = getInputValue(row, 'Clusters');
        const sampleCount = getInputValue(row, 'SampleCount');
        
        // Update %Flowcell
        const percentFlowcellInput = row.querySelector('[data-field="%(Flowcell)"]');
        if (percentFlowcellInput && flowcellMax > 0) {
            const percentageOfFlowcellMax = (clusters * 100) / flowcellMax;
            percentFlowcellInput.value = percentageOfFlowcellMax.toFixed(2) + '%';
        }
        
        // Update %Sample per Flowcell
        const percentSampleInput = row.querySelector('[data-field="%Sample per (Flowcell)"]');
        if (percentSampleInput && flowcellMax > 0 && sampleCount > 0) {
            const percentagePerSample = (clusters * 100) / (sampleCount * flowcellMax);
            percentSampleInput.value = percentagePerSample.toFixed(2) + '%';
        } else if (percentSampleInput) {
            percentSampleInput.value = '0.00%';
        }
    });

    // Calculate sum of (berekening4 * berekening3) across all rows
    const totalProduct = Array.from(rows).reduce((sum, row) => {
        const percentSample = parseFloat(row.querySelector('[data-field="%Sample per (Flowcell)"]').value) || 0;
        const nM = parseFloat(row.querySelector('[data-field="nM"]').value) || 0;
        return sum + (percentSample * nM);
    }, 0);

    // Second pass: calculate UI NGS Pool for each row and sum them
    let totalUlNgsPool = 0;
    rows.forEach(row => {
        const percentSample = parseFloat(row.querySelector('[data-field="%Sample per (Flowcell)"]').value) || 0;
        const nM = parseFloat(row.querySelector('[data-field="nM"]').value) || 0;
        const uiNgsPoolInput = row.querySelector('[data-field="UI NGS Pool"]');

        if (uiNgsPoolInput && totalProduct > 0) {
            // Formula: (percentSample * 50 * 3) / (sum of all (percentSample * nM))
            const uiNgsPool = (percentSample * 50 * 3) / totalProduct;
            uiNgsPoolInput.value = uiNgsPool.toFixed(2);
            totalUlNgsPool += uiNgsPool;
        } else if (uiNgsPoolInput) {
            uiNgsPoolInput.value = '0.00';
        }
    });

    // Calculate and update ul Tris aan pool toevoegen
    const trisToAdd = 50 - totalUlNgsPool;
    const trisOutput = document.getElementById('trisOutput');
    trisOutput.textContent = `ul Tris aan pool toevoegen: ${trisToAdd.toFixed(2)}`;
}

// Function to create a cell with appropriate input type
function createCell(fieldName, isEditable) {
    const td = document.createElement('td');
    
    if (fieldName === 'Application') { 
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

// Function to check if all required fields are filled
function areRequiredFieldsFilled(row) {
    return requiredFields.every(field => {
        const input = row.querySelector(`[data-field="${field}"]`);
        return input && input.value && input.value.trim() !== '';
    });
}

// Function to calculate clusters based on application type
function calculateClusters(application, genomeSize, coverage, sampleCount) {
    switch(application) {
        case 'WGS':
            return (genomeSize * coverage * sampleCount) / 270;
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
    
    const value = input.value.trim();
    if (input.type === 'select-one') {
        return value;
    }
    
    // Remove percentage sign if present and convert to number
    if (value.endsWith('%')) {
        return parseNumber(value.slice(0, -1));
    }
    
    return value === '' ? 0 : parseNumber(value);
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