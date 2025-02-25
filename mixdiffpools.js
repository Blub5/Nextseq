let finalCalculationConfirmed = false;
let lastUsedProjectPoolNumber = 0;
let existingProjectPools = new Set();

function getSettings() {
    const savedSettings = JSON.parse(localStorage.getItem('mixdiffpoolsSettings'));
    return savedSettings || {
        flowcells: { P1: 100000000, P2: 400000000, P3: 1200000000, P4: 1800000000 },
        poolSettings: { basePoolVolume: 50, expectedNM: 3 },
        applicationSettings: { cycli: 270 },
        projectPoolSettings: { prefix: 'NGS-' }
    };
}

const preliminaryRequiredFields = ['Application', 'GenomeSize', 'Coverage', 'SampleCount'];
const fullRequiredFields = ['Application', 'GenomeSize', 'Coverage', 'SampleCount', 'Conc', 'AvgLibSize'];

const poolColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9EC1CF', '#CC99C9',
    '#F7A072', '#B2B1CF', '#66CC99', '#F9DC5C', '#F28C28', '#2980B9', '#27AE60', '#8E44AD'
];

function getColorForProjectPool(projectPool) {
    let hash = 0;
    for (let i = 0; i < projectPool.length; i++) hash = projectPool.charCodeAt(i) + ((hash << 5) - hash);
    return poolColors[Math.abs(hash) % poolColors.length];
}

function parseNumber(value) {
    if (typeof value === 'string' && value.includes('e')) return parseFloat(value);
    return Number(value);
}

function parsePercentage(value) {
    if (typeof value === 'string') return parseFloat(value.replace('%', '')) || 0;
    return value || 0;
}

function getPreciseValue(input) {
    if (!input) return 0;
    return input.dataset.preciseValue ? parseFloat(input.dataset.preciseValue) : parseFloat(input.value);
}

async function fetchExistingProjectPools() {
    try {
        const response = await fetch('get_table_data.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ table: 'mixdiffpools' })
        });
        if (!response.ok) throw new Error(`Failed to fetch project pools: ${response.status}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Unknown error');

        existingProjectPools = new Set(result.data.map(row => row.ProjectPool));
        lastUsedProjectPoolNumber = Math.max(0, ...Array.from(existingProjectPools)
            .filter(pp => pp.match(/^NGS-\d+$/))
            .map(pp => parseInt(pp.replace('NGS-', ''))));
        return lastUsedProjectPoolNumber;
    } catch (error) {
        console.error('Error fetching existing ProjectPools:', error);
        return 0;
    }
}

async function fetchRunNames() {
    try {
        const response = await fetch('get_run_names.php', { method: 'GET', headers: { 'Accept': 'application/json' } });
        if (!response.ok) throw new Error(`Failed to fetch run names: ${response.status}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Unknown error');
        return result.runNames;
    } catch (error) {
        console.error('Error fetching run names:', error);
        return [];
    }
}

async function loadRunData(runName) {
    try {
        const response = await fetch('get_table_data.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ table: 'mixdiffpools', filter: { RunName: runName } })
        });
        if (!response.ok) throw new Error(`Failed to fetch run data: ${response.status}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Unknown error');

        const tbody = document.querySelector('#spreadsheetTable tbody');
        tbody.innerHTML = '';

        result.data.forEach(rowData => {
            const newRow = document.createElement('tr');
            const headers = ['ProjectPool', 'Application', 'GenomeSize', 'Coverage', 'SampleCount', 'Conc', 'AvgLibSize', 'Clusters', '%(Flowcell)', 'nM', '%Sample per (Flowcell)', 'UI NGS Pool'];

            headers.forEach(header => {
                const td = document.createElement('td');
                const input = document.createElement(header === 'Application' ? 'select' : 'input');
                input.dataset.field = header;
                
                if (header === 'Application') {
                    const options = ['WGS', 'RNAseq', 'Amplicon', 'MGX'];
                    options.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt;
                        option.textContent = opt;
                        input.appendChild(option);
                    });
                    input.value = rowData[header] || '';
                } else {
                    input.type = 'text';
                    input.value = rowData[header] || '';
                    if (header === 'ProjectPool') {
                        input.readOnly = true;
                        input.style.backgroundColor = '#f0f0f0';
                    } else if (['Clusters', '%(Flowcell)', 'nM', '%Sample per (Flowcell)', 'UI NGS Pool'].includes(header)) {
                        input.readOnly = true;
                        input.placeholder = 'Output';
                        input.style.backgroundColor = '#f0f0f0';
                    } else {
                        input.placeholder = 'Insert';
                        input.style.color = '#333';
                    }
                }
                td.appendChild(input);
                newRow.appendChild(td);
            });

            const tdAction = document.createElement('td');
            const delBtn = document.createElement('button');
            delBtn.textContent = 'Verwijder';
            delBtn.className = 'removeButton';
            delBtn.addEventListener('click', () => {
                existingProjectPools.delete(rowData.ProjectPool);
                tbody.removeChild(newRow);
                updatePreliminaryFlowcell();
            });
            tdAction.appendChild(delBtn);
            newRow.appendChild(tdAction);

            tbody.appendChild(newRow);
        });
        updatePreliminaryFlowcell();
    } catch (error) {
        console.error('Error loading run data:', error);
        showErrorToUser('Failed to load run data: ' + error.message);
    }
}

async function addRow() {
    const tbody = document.querySelector('#spreadsheetTable tbody');
    const newRow = document.createElement('tr');
    const settings = getSettings();
    const prefix = settings.projectPoolSettings.prefix || 'NGS-';
    let nextNumber = lastUsedProjectPoolNumber + 1;
    while (existingProjectPools.has(`${prefix}${nextNumber}`)) nextNumber++;
    const newProjectPool = `${prefix}${nextNumber}`;

    const headers = ['ProjectPool', 'Application', 'GenomeSize', 'Coverage', 'SampleCount', 'Conc', 'AvgLibSize', 'Clusters', '%(Flowcell)', 'nM', '%Sample per (Flowcell)', 'UI NGS Pool'];
    headers.forEach(header => {
        const td = document.createElement('td');
        if (header === 'Application') {
            const select = document.createElement('select');
            select.dataset.field = header;
            const options = ['', 'WGS', 'RNAseq', 'Amplicon', 'MGX'];
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt || 'Selecteer...';
                select.appendChild(option);
            });
            td.appendChild(select);
        } else {
            const input = document.createElement('input');
            input.type = 'text';
            input.dataset.field = header;
            if (header === 'ProjectPool') {
                input.value = newProjectPool;
                input.readOnly = true;
                input.style.backgroundColor = '#f0f0f0';
            } else if (['Clusters', '%(Flowcell)', 'nM', '%Sample per (Flowcell)', 'UI NGS Pool'].includes(header)) {
                input.readOnly = true;
                input.placeholder = 'Output';
                input.style.backgroundColor = '#f0f0f0';
            } else {
                input.placeholder = 'Insert';
            }
            td.appendChild(input);
        }
        newRow.appendChild(td);
    });

    const tdAction = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Verwijder';
    delBtn.className = 'removeButton';
    delBtn.addEventListener('click', () => {
        tbody.removeChild(newRow);
        updatePreliminaryFlowcell();
    });
    tdAction.appendChild(delBtn);
    newRow.appendChild(tdAction);

    tbody.appendChild(newRow);
    lastUsedProjectPoolNumber = Math.max(lastUsedProjectPoolNumber, nextNumber);
    updatePreliminaryFlowcell();
}

async function savePreliminaryData() {
    const runSelect = document.getElementById('runSelect');
    const newRunNameInput = document.getElementById('newRunNameInput');
    let runName = runSelect.value === 'new' ? newRunNameInput.value.trim() : runSelect.value;

    if (!runName) {
        showErrorToUser('Please select an existing run or enter a new run name.');
        return false;
    }

    const rows = document.querySelectorAll('#spreadsheetTable tbody tr');
    const allData = [];
    const requiredFields = ['ProjectPool', 'Application', 'GenomeSize', 'Coverage', 'SampleCount', 'Conc', 'AvgLibSize'];
    let allValid = true;

    for (const row of rows) {
        const data = {
            RunName: runName,
            ProjectPool: getInputValue(row, 'ProjectPool'),
            Application: getInputValue(row, 'Application'),
            GenomeSize: parseInt(getInputValue(row, 'GenomeSize')) || 0,
            Coverage: parseFloat(getInputValue(row, 'Coverage')) || 0,
            SampleCount: parseInt(getInputValue(row, 'SampleCount')) || 0,
            Conc: parseFloat(getInputValue(row, 'Conc')) || 0,
            AvgLibSize: parseInt(getInputValue(row, 'AvgLibSize')) || 0
        };

        for (const field of requiredFields) {
            if (!data[field] || data[field] === '') {
                console.warn(`Missing required field: ${field} for ProjectPool: ${data.ProjectPool}`);
                allValid = false;
                showErrorToUser(`Missing required field: ${field} in row ${data.ProjectPool}`);
                break;
            }
        }
        if (allValid) allData.push(data);
    }

    if (!allValid || allData.length === 0) {
        showErrorToUser('Please fill all required fields in all rows.');
        return false;
    }

    let allSaved = true;
    for (const data of allData) {
        const isExisting = existingProjectPools.has(data.ProjectPool);
        const url = isExisting ? 'update_preliminary_data.php' : 'save_preliminary_data.php';

        try {
            console.log(`Sending to ${url}:`, JSON.stringify(data));
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(data)
            });
            const responseText = await response.text();
            console.log('Raw server response:', responseText);

            if (!response.ok) throw new Error(`Server returned status ${response.status}: ${responseText}`);
            const result = JSON.parse(responseText);
            if (!result.success) throw new Error(result.message || 'Unknown error');

            if (!isExisting) existingProjectPools.add(data.ProjectPool);
            console.log(`Saved ${data.ProjectPool} successfully`);
        } catch (error) {
            console.error('Error saving data:', error);
            showErrorToUser(`Failed to save ${data.ProjectPool}: ${error.message}`);
            allSaved = false;
        }
    }
    return allSaved;
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
        case 'WGS': return (genomeSize * coverage * sampleCount) / settings.applicationSettings.cycli;
        case 'RNAseq':
        case 'Amplicon':
        case 'MGX': return coverage * sampleCount;
        default: return 0;
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
    if (totalClusters <= flowcells.P1) return 'P1';
    if (totalClusters <= flowcells.P2) return 'P2';
    if (totalClusters <= flowcells.P3) return 'P3';
    return 'P4';
}

function updatePreliminaryFlowcell() {
    const rows = document.querySelectorAll('#spreadsheetTable tbody tr');
    const totalClusters = Array.from(rows).reduce((sum, row) => {
        const clustersInput = row.querySelector('[data-field="Clusters"]');
        return sum + (clustersInput && clustersInput.dataset.preciseValue ? parseFloat(clustersInput.dataset.preciseValue) : 0);
    }, 0);

    const overallFlowcell = determineFlowcell(totalClusters);
    const flowcellOutput = document.getElementById('flowcellOutput');
    if (flowcellOutput) flowcellOutput.textContent = `Current Flowcell: ${overallFlowcell}`;

    const percentageHeader = document.querySelector('#spreadsheetTable th[data-field="%(Flowcell)"]');
    if (percentageHeader) percentageHeader.textContent = `%${overallFlowcell}`;
}

function getInputValue(row, fieldName) {
    const input = row.querySelector(`[data-field="${fieldName}"]`);
    if (!input) return '';
    return input.tagName === 'SELECT' ? input.value : input.value.trim();
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
    if (isNaN(numericAvgLibSize) || isNaN(numericConc) || numericAvgLibSize === 0) return 0;
    return (numericConc * 1000000) / (649 * numericAvgLibSize);
}

function updateFinalPercentagesAndFlowcell() {
    const rows = document.querySelectorAll('#spreadsheetTable tbody tr');
    const totalClusters = Array.from(rows).reduce((sum, row) => {
        const clustersInput = row.querySelector('[data-field="Clusters"]');
        return sum + (clustersInput && clustersInput.dataset.preciseValue ? parseFloat(clustersInput.dataset.preciseValue) : 0);
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
    const overallFlowcell = determineFlowcell(totalClusters);
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
    if (!calculationsSaved) showErrorToUser('Failed to save final calculations');
    updatePreliminaryFlowcell();
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

        try {
            const response = await fetch('update_calculations.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            const result = await response.json();
            if (!result.success) throw new Error(result.message || 'Unknown error');
        } catch (error) {
            console.error('Error saving calculations:', error);
            showErrorToUser('Error saving calculations: ' + error.message);
            return false;
        }
    }
    return true;
}

function updateProgressBarAndLegend(rowCalculations, flowcellMax) {
    const progressBar = document.querySelector('.progress-bar');
    const legendContainer = document.getElementById('progressLegend');
    const progressPercentage = document.getElementById('progressPercentage');
    
    progressBar.innerHTML = '';
    legendContainer.innerHTML = '';
    
    const projectPools = new Map();
    rowCalculations.forEach(({ row, clusters }) => {
        const projectPool = getInputValue(row, 'ProjectPool');
        if (projectPool && clusters > 0) {
            if (projectPools.has(projectPool)) projectPools.get(projectPool).clusters += clusters;
            else projectPools.set(projectPool, { clusters, color: getColorForProjectPool(projectPool) });
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

document.addEventListener('DOMContentLoaded', async () => {
    await fetchExistingProjectPools();
    const runNames = await fetchRunNames();
    const runSelect = document.getElementById('runSelect');
    // Set default to 'new'
    runSelect.value = 'new';
    document.getElementById('newRunNameInput').style.display = 'block';
    
    runNames.forEach(runName => {
        const option = document.createElement('option');
        option.value = runName;
        option.textContent = runName;
        runSelect.appendChild(option);
    });

    runSelect.addEventListener('change', async () => {
        const newRunNameInput = document.getElementById('newRunNameInput');
        if (runSelect.value === 'new') {
            newRunNameInput.style.display = 'block';
            document.querySelector('#spreadsheetTable tbody').innerHTML = '';
            await addRow();
        } else {
            newRunNameInput.style.display = 'none';
            if (runSelect.value) await loadRunData(runSelect.value);
        }
    });

    document.getElementById('addRowButton').addEventListener('click', addRow);

    document.getElementById('calculateUINGSPoolButton').addEventListener('click', async () => {
        const preliminarySaved = await savePreliminaryData();
        if (preliminarySaved) await calculateUINGSPool();
        else showErrorToUser('Cannot proceed with calculations due to errors in saving preliminary data.');
    });

    const tbody = document.querySelector('#spreadsheetTable tbody');
    tbody.addEventListener('input', e => {
        const input = e.target;
        if (input.tagName === 'INPUT' && input.dataset.field && !['UI NGS Pool'].includes(input.dataset.field)) {
            const row = input.closest('tr');
            realTimeCalculate(row);
        }
    });

    tbody.addEventListener('change', e => {
        const select = e.target;
        if (select.tagName === 'SELECT' && select.dataset.field === 'Application') {
            const row = select.closest('tr');
            realTimeCalculate(row);
        }
    });
    
    // Add a row automatically when page loads
    await addRow();
});