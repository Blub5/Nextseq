let finalCalculationConfirmed = false;
let lastUsedProjectPoolNumber = 0;
let existingProjectPools = new Set();

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

const preliminaryRequiredFields = ['Application', 'GenomeSize', 'Coverage', 'SampleCount'];
const fullRequiredFields = ['Application', 'GenomeSize', 'Coverage', 'SampleCount', 'Conc', 'AvgLibSize'];

const poolColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEEAD', '#D4A5A5', '#9EC1CF', '#CC99C9',
    '#F7A072', '#B2B1CF', '#66CC99', '#F9DC5C',
    '#F28C28', '#2980B9', '#27AE60', '#8E44AD'
];

function getColorForProjectPool(projectPool) {
    let hash = 0;
    for (let i = 0; i < projectPool.length; i++) {
        hash = projectPool.charCodeAt(i) + ((hash << 5) - hash);
    }
    return poolColors[Math.abs(hash) % poolColors.length];
}

function parseNumber(value) {
    if (typeof value === 'string' && value.includes('e')) {
        return parseFloat(value);
    }
    return Number(value);
}

function parsePercentage(value) {
    if (typeof value === 'string') {
        value = value.replace('%', '');
        return parseFloat(value) || 0;
    }
    return value || 0;
}

function getPreciseValue(input) {
    if (!input) return 0;
    return input.dataset.preciseValue ? parseFloat(input.dataset.preciseValue) : parseFloat(input.value);
}

async function getLatestProjectPoolNumber() {
    try {
        const response = await fetch('get_latest_projectpool.php', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch latest ProjectPool: ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Unknown error fetching ProjectPool');
        }

        const latestProjectPool = result.latestProjectPool || 'NGS-0';
        const number = parseInt(latestProjectPool.replace('NGS-', '')) || 0;
        lastUsedProjectPoolNumber = number;
        return number;
    } catch (error) {
        console.error('Error fetching latest ProjectPool:', error);
        return 0;
    }
}

async function fetchExistingProjectPools() {
    try {
        const response = await fetch('get_table_data.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ table: 'mixdiffpools' })
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch project pools: ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Unknown error fetching project pools');
        }

        existingProjectPools = new Set(result.data.map(row => row.ProjectPool));
        lastUsedProjectPoolNumber = Math.max(0, ...Array.from(existingProjectPools)
            .filter(pp => pp.match(/^NGS-\d+$/))
            .map(pp => parseInt(pp.replace('NGS-', ''))));
        console.log('Initialized existingProjectPools:', Array.from(existingProjectPools));
        return lastUsedProjectPoolNumber;
    } catch (error) {
        console.error('Error fetching existing ProjectPools:', error);
        return 0;
    }
}

async function savePreliminaryData() {
    const rows = document.querySelectorAll('#spreadsheetTable tbody tr');
    const allData = [];
    const requiredFields = ['ProjectPool', 'Application', 'GenomeSize', 'Coverage', 'SampleCount', 'Conc', 'AvgLibSize'];
    let allValid = true;

    for (const row of rows) {
        const data = {
            ProjectPool: getInputValue(row, 'ProjectPool'),
            Application: getInputValue(row, 'Application'),
            GenomeSize: parseInt(getInputValue(row, 'GenomeSize')) || 0,
            Coverage: parseInt(getInputValue(row, 'Coverage')) || 0,
            SampleCount: parseInt(getInputValue(row, 'SampleCount')) || 0,
            Conc: parseFloat(getInputValue(row, 'Conc')) || 0.0,
            AvgLibSize: parseFloat(getInputValue(row, 'AvgLibSize')) || 0.0
        };

        for (const field of requiredFields) {
            if (!data[field] || data[field] === '' || data[field] === 0) {
                console.warn(`Missing or empty required field: ${field} for ProjectPool: ${data.ProjectPool}`);
                allValid = false;
                showErrorToUser(`Missing or empty field: ${field} in row ${data.ProjectPool}`);
                break;
            }
        }

        if (allValid) {
            allData.push(data);
        }
    }

    if (!allValid || allData.length === 0) {
        showErrorToUser('Please fill in all required fields for all rows before saving.');
        return false;
    }

    let allSaved = true;
    for (const data of allData) {
        try {
            const response = await fetch('save_preliminary_data.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const result = await response.json();
                console.error('Non-JSON response:', result);
                throw new Error(`Server returned status ${response.status}: ${result.message || 'Unknown error'}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Unknown error from server');
            }

            console.log(`Data saved successfully for ${data.ProjectPool}`);
            existingProjectPools.add(data.ProjectPool);
            lastUsedProjectPoolNumber = Math.max(lastUsedProjectPoolNumber, parseInt(data.ProjectPool.replace('NGS-', '')));
        } catch (error) {
            console.error('Error saving preliminary data:', error);
            showErrorToUser(`Failed to save data for ${data.ProjectPool}: ${error.message}`);
            allSaved = false;
        }
    }
    return allSaved;
}

async function saveCalculations() {
    const rows = document.querySelectorAll('#spreadsheetTable tbody tr');

    for (const row of rows) {
        const data = {
            ProjectPool: getInputValue(row, 'ProjectPool'),
            Clusters: getPreciseValue(row.querySelector('[data-field="Clusters"]')),
            '%Flowcell': parseFloat(row.querySelector('[data-field="%(Flowcell)"]').dataset.preciseValue),
            nM: getPreciseValue(row.querySelector('[data-field="nM"]')),
            '%SamplePerFlowcell': parseFloat(row.querySelector('[data-field="%Sample per (Flowcell)"]').dataset.preciseValue),
            'UI_NGS_Pool': getInputValue(row, 'UI NGS Pool')
        };

        console.log('Sending data to update_calculations.php:', JSON.stringify(data));

        try {
            const response = await fetch('update_calculations.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const responseText = await response.text();
            console.log('Raw server response:', responseText);

            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}: ${responseText}`);
            }

            const result = JSON.parse(responseText);
            if (!result.success) {
                throw new Error(result.message || 'Failed to save calculations');
            }
            console.log(`Calculations saved successfully for ${data.ProjectPool}`);
        } catch (error) {
            console.error('Error saving calculations:', error);
            showErrorToUser('Error saving calculations: ' + error.message);
            return false;
        }
    }
    return true;
}

function showErrorToUser(message) {
    const errorDiv = document.getElementById('error-messages');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    } else {
        alert(message);
    }
}

function calculateClusters(application, genomeSize, coverage, sampleCount) {
    const settings = getSettings();
    switch (application) {
        case 'WGS':
            return (genomeSize * coverage * sampleCount) / settings.applicationSettings.cycli;
        case 'RNAseq':
        case 'Amplicon':
        case 'MGX':
            return coverage * sampleCount;
        default:
            return 0;
    }
}

function calculateClustersForRow(row) {
    if (!arePreliminaryFieldsFilled(row)) return;
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

function determineFlowcell(totalClusters) {
    const flowcells = getSettings().flowcells;
    console.log('Inside determineFlowcell - Total Clusters:', totalClusters);
    let result;
    if (totalClusters <= flowcells.P1) result = 'P1';
    else if (totalClusters <= flowcells.P2) result = 'P2';
    else if (totalClusters <= flowcells.P3) result = 'P3';
    else result = 'P4';
    console.log('Flowcell Thresholds Checked:', flowcells);
    console.log('Returning Flowcell:', result);
    return result;
}

function updatePreliminaryFlowcell() {
    const rows = document.querySelectorAll('#spreadsheetTable tbody tr');
    const totalClusters = Array.from(rows).reduce((sum, row) => {
        const clustersInput = row.querySelector('[data-field="Clusters"]');
        const val = clustersInput && clustersInput.dataset.preciseValue ? parseFloat(clustersInput.dataset.preciseValue) : 0;
        return sum + val;
    }, 0);
    
    console.log('Total Clusters Calculated in updatePreliminaryFlowcell:', totalClusters);
    
    const overallFlowcell = determineFlowcell(totalClusters);
    
    console.log('Updating UI with Flowcell:', overallFlowcell);
    
    const flowcellOutput = document.getElementById('flowcellOutput');
    if (flowcellOutput) {
        flowcellOutput.textContent = `Current Flowcell: ${overallFlowcell}`;
        console.log('UI Updated - flowcellOutput.textContent:', flowcellOutput.textContent);
    } else {
        console.error('flowcellOutput element not found!');
    }
    
    const percentageHeader = document.querySelector('#spreadsheetTable th[data-field="%(Flowcell)"]');
    if (percentageHeader) {
        percentageHeader.textContent = `%${overallFlowcell}`;
        console.log('Percentage Header Updated:', percentageHeader.textContent);
    } else {
        console.error('Percentage header not found!');
    }
}

function getInputValue(row, fieldName) {
    const input = row.querySelector(`[data-field="${fieldName}"]`);
    if (!input) return '';
    
    if (input.type === 'select-one') {
        return input.value;
    }
    
    if (input.readOnly) {
        return input.value;
    }
    
    const value = input.value.trim();
    return value.endsWith('%') ? parsePercentage(value) : (value === '' ? 0 : parseNumber(value));
}

function arePreliminaryFieldsFilled(row) {
    return preliminaryRequiredFields.every(field => {
        const input = row.querySelector(`[data-field="${field}"]`);
        return input && input.value && input.value.trim() !== '';
    });
}

function realTimeCalculate(row) {
    if (!arePreliminaryFieldsFilled(row)) return;

    calculateClustersForRow(row);
    updateFinalPercentagesAndFlowcell();
    updatePreliminaryFlowcell();

    const conc = getInputValue(row, 'Conc');
    const avgLibSize = getInputValue(row, 'AvgLibSize');
    if (conc > 0 && avgLibSize > 0) {
        const nM = calculateNM(avgLibSize, conc);
        const nMInput = row.querySelector('[data-field="nM"]');
        if (nMInput && nM > 0) {
            nMInput.dataset.preciseValue = nM.toString();
            nMInput.value = nM.toFixed(1);
        }
    }
}

function calculateNM(avgLibSize, conc) {
    const numericAvgLibSize = parseFloat(avgLibSize);
    const numericConc = parseFloat(conc);
    
    if (isNaN(numericAvgLibSize) || isNaN(numericConc) || numericAvgLibSize === 0) {
        return 0;
    }
    
    return (numericConc * 1000000) / (649 * numericAvgLibSize);
}

function updateFinalPercentagesAndFlowcell() {
    const rows = document.querySelectorAll('#spreadsheetTable tbody tr');
    const totalClusters = Array.from(rows).reduce((sum, row) => {
        const clustersInput = row.querySelector('[data-field="Clusters"]');
        const val = clustersInput && clustersInput.dataset.preciseValue ? parseFloat(clustersInput.dataset.preciseValue) : 0;
        return sum + val;
    }, 0);
    const overallFlowcell = determineFlowcell(totalClusters);
    const flowcellMax = getSettings().flowcells[overallFlowcell];
    
    const rowCalculations = Array.from(rows).map(row => {
        const clustersInput = row.querySelector('[data-field="Clusters"]');
        const clusters = clustersInput && clustersInput.dataset.preciseValue ? parseFloat(clustersInput.dataset.preciseValue) : 0;
        const sampleCount = getInputValue(row, 'SampleCount');
        const percentageOfFlowcell = (clusters * 100) / flowcellMax;
        const percentagePerSample = sampleCount > 0 ? (clusters * 100) / (sampleCount * flowcellMax) : 0;
        
        return { row, clusters, percentageOfFlowcell, percentagePerSample };
    });
    
    rowCalculations.forEach(({ row, percentageOfFlowcell, percentagePerSample }) => {
        const percentFlowcellInput = row.querySelector('[data-field="%(Flowcell)"]');
        if (percentFlowcellInput) {
            percentFlowcellInput.dataset.preciseValue = percentageOfFlowcell.toString();
            percentFlowcellInput.value = percentageOfFlowcell.toFixed(1) + '%';
        }
        const percentSampleInput = row.querySelector('[data-field="%Sample per (Flowcell)"]');
        if (percentSampleInput) {
            percentSampleInput.dataset.preciseValue = percentagePerSample.toString();
            percentSampleInput.value = percentagePerSample.toFixed(1) + '%';
        }
    });
    
    updateProgressBarAndLegend(rowCalculations, flowcellMax);
    updatePreliminaryFlowcell();
    
    const trisOutput = document.getElementById('trisOutput');
    trisOutput.textContent = `ul Tris aan pool toevoegen: ${getSettings().poolSettings.basePoolVolume.toFixed(1)}`;
}

async function calculateUINGSPool() {
    const rows = document.querySelectorAll('#spreadsheetTable tbody tr');
    const totalClusters = Array.from(rows).reduce((sum, row) => {
        const clustersInput = row.querySelector('[data-field="Clusters"]');
        return sum + (clustersInput && clustersInput.dataset.preciseValue ? parseFloat(clustersInput.dataset.preciseValue) : 0);
    }, 0);
    console.log('Total Clusters in calculateUINGSPool:', totalClusters);
    const overallFlowcell = determineFlowcell(totalClusters);
    console.log('Flowcell determined in calculateUINGSPool:', overallFlowcell);
    
    const flowcellMax = getSettings().flowcells[overallFlowcell];
    
    const rowCalculations = Array.from(rows).map(row => {
        const clustersInput = row.querySelector('[data-field="Clusters"]');
        const clusters = clustersInput && clustersInput.dataset.preciseValue ? parseFloat(clustersInput.dataset.preciseValue) : 0;
        const nM = getPreciseValue(row.querySelector('[data-field="nM"]'));
        return { row, clusters, nM };
    });
    
    const settings = getSettings();
    
    rowCalculations.forEach(({ row, clusters, nM }) => {
        if (totalClusters > 0 && nM > 0) {
            const uiNgsPool = (clusters / totalClusters) * settings.poolSettings.basePoolVolume * (settings.poolSettings.expectedNM / nM);
            const uiNgsPoolInput = row.querySelector('[data-field="UI NGS Pool"]');
            if (uiNgsPoolInput) {
                uiNgsPoolInput.dataset.preciseValue = uiNgsPool.toString();
                uiNgsPoolInput.value = uiNgsPool.toFixed(1);
            }
        }
    });
    
    const trisToAdd = settings.poolSettings.basePoolVolume - rowCalculations.reduce((sum, { row }) => {
        const uiNgsPoolInput = row.querySelector('[data-field="UI NGS Pool"]');
        return sum + (uiNgsPoolInput && uiNgsPoolInput.dataset.preciseValue ? parseFloat(uiNgsPoolInput.dataset.preciseValue) : 0);
    }, 0);
    
    const trisOutput = document.getElementById('trisOutput');
    trisOutput.textContent = `ul Tris aan pool toevoegen: ${trisToAdd.toFixed(1)}`;

    const calculationsSaved = await saveCalculations();
    if (!calculationsSaved) {
        showErrorToUser('Failed to save final calculations');
    }
    updatePreliminaryFlowcell(); // Ensure flowcell updates after UI NGS Pool calculation
}

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
    
    const sortedPools = Array.from(projectPools.entries()).sort((a, b) => b[1].clusters - a[1].clusters);
    let totalPercentage = 0;
    
    sortedPools.forEach(([projectPool, data]) => {
        const percentage = (data.clusters / flowcellMax) * 100;
        if (percentage > 0) {
            const segment = document.createElement('div');
            segment.className = 'progress-segment';
            segment.style.width = `${percentage}%`;
            segment.style.backgroundColor = data.color;
            segment.title = `${projectPool}: ${percentage.toFixed(1)}%`;
            progressBar.appendChild(segment);
            
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <div class="legend-color" style="background-color: ${data.color}"></div>
                <span>${projectPool} (${percentage.toFixed(1)}%)</span>
            `;
            legendContainer.appendChild(legendItem);
        }
        totalPercentage += percentage;
    });
    
    progressPercentage.textContent = `${totalPercentage.toFixed(1)}%`;
    progressPercentage.style.color = totalPercentage > 90 ? '#FF4444' : totalPercentage > 70 ? '#FFA500' : '#FFFFFF';
}

const userEditableFields = [
    'ProjectPool',
    'Application',
    'GenomeSize',
    'Coverage',
    'SampleCount',
    'Conc',
    'AvgLibSize'
];

async function createCell(fieldName, isEditable) {
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
        
        let nextNumber = lastUsedProjectPoolNumber + 1;
        while (existingProjectPools.has(`${prefix}${nextNumber}`)) {
            nextNumber++;
        }
        const newProjectPool = `${prefix}${nextNumber}`;
        input.value = newProjectPool;
        existingProjectPools.add(newProjectPool);
        lastUsedProjectPoolNumber = nextNumber;
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
        
        td.appendChild(select);
    } else if (isEditable) {
        const input = document.createElement('input');
        input.type = 'text';
        input.dataset.field = fieldName;
        input.placeholder = 'Vul in...';
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

async function addRow() {
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

    for (const header of headers) {
        const isEditable = userEditableFields.includes(header);
        const cell = await createCell(header, isEditable);
        newRow.appendChild(cell);
    }

    const tdAction = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Verwijder';
    delBtn.className = 'removeButton';
    delBtn.addEventListener('click', function() {
        const projectPool = newRow.querySelector('[data-field="ProjectPool"]').value;
        existingProjectPools.delete(projectPool);
        tbody.removeChild(newRow);
        updatePreliminaryFlowcell();
    });
    tdAction.appendChild(delBtn);
    newRow.appendChild(tdAction);

    tbody.appendChild(newRow);
    updatePreliminaryFlowcell();
}

document.addEventListener('DOMContentLoaded', async function() {
    await fetchExistingProjectPools();
    await addRow();
    document.getElementById('addRowButton').addEventListener('click', addRow);

    const controls = document.querySelector('.controls');

    const uiPoolButton = document.createElement('button');
    uiPoolButton.id = 'calculateUINGSPoolButton';
    uiPoolButton.textContent = 'Bereken NGS UI Pool';
    uiPoolButton.style.backgroundColor = '#088c04';
    uiPoolButton.style.color = 'white';
    uiPoolButton.style.border = 'none';
    uiPoolButton.style.padding = '8px 16px';
    uiPoolButton.style.borderRadius = '6px';
    uiPoolButton.style.fontSize = '14px';
    uiPoolButton.style.cursor = 'pointer';
    uiPoolButton.style.fontWeight = 'bold';
    uiPoolButton.style.marginLeft = '10px';
    controls.appendChild(uiPoolButton);
    uiPoolButton.addEventListener('click', async function() {
        const preliminarySaved = await savePreliminaryData();
        if (preliminarySaved) {
            await calculateUINGSPool();
        } else {
            showErrorToUser('Cannot proceed with calculations due to errors in saving preliminary data.');
        }
    });

    const tbody = document.querySelector('#spreadsheetTable tbody');
    tbody.addEventListener('input', function(e) {
        const input = e.target;
        if (input.tagName === 'INPUT' && input.dataset.field) {
            const row = input.closest('tr');
            if (row && !['UI NGS Pool'].includes(input.dataset.field)) {
                realTimeCalculate(row);
            }
        }
    });

    tbody.addEventListener('change', function(e) {
        const select = e.target;
        if (select.tagName === 'SELECT' && select.dataset.field === 'Application') {
            const row = select.closest('tr');
            realTimeCalculate(row);
        }
    });

    tbody.addEventListener('click', function(e) {
        if (e.target.className === 'removeButton') {
            updatePreliminaryFlowcell();
        }
    });
});