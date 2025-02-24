let finalCalculationConfirmed = false;
let lastUsedProjectPoolNumber = 0;
let existingProjectPools = new Set();

const poolColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9EC1CF', '#CC99C9',
    '#F7A072', '#B2B1CF', '#66CC99', '#F9DC5C', '#F28C28', '#2980B9', '#27AE60', '#8E44AD'
];

function getSettings() {
    const savedSettings = JSON.parse(localStorage.getItem('mixdiffpoolsSettings'));
    return savedSettings || {
        flowcells: { P1: 100000000, P2: 400000000, P3: 1200000000, P4: 1800000000 },
        poolSettings: { basePoolVolume: 50, expectedNM: 3 },
        applicationSettings: { cycli: 270 },
        projectPoolSettings: { prefix: 'NGS-' }
    };
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

function getColorForProjectPool(projectPool) {
    let hash = 0;
    for (let i = 0; i < projectPool.length; i++) hash = projectPool.charCodeAt(i) + ((hash << 5) - hash);
    return poolColors[Math.abs(hash) % poolColors.length];
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
        console.log('Fetched existing ProjectPools:', Array.from(existingProjectPools), 'Last number:', lastUsedProjectPoolNumber);
        return lastUsedProjectPoolNumber;
    } catch (error) {
        console.error('Error fetching existing ProjectPools:', error);
        showErrorToUser('Failed to fetch existing project pools: ' + error.message);
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

        console.log('Fetched data for run:', runName, result.data);

        const tbody = document.querySelector('#spreadsheetTable tbody');
        tbody.innerHTML = '';

        result.data.forEach(rowData => {
            const newRow = document.createElement('tr');
            const headers = ['ProjectPool', 'Application', 'GenomeSize', 'Coverage', 'SampleCount', 'Conc', 'AvgLibSize', 'Clusters', '%Flowcell', 'nM', '%SamplePerFlowcell', 'UI NGS Pool'];

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
                    const rawValue = rowData[header] ?? '';
                    let formattedValue = rawValue;

                    // Apply rounding/formatting based on your requirements
                    if (header === 'Coverage') {
                        formattedValue = Math.round(parseFloat(rawValue) || 0); // Whole number
                    } else if (header === 'SampleCount') {
                        formattedValue = Math.round(parseFloat(rawValue) || 0); // Whole number
                    } else if (header === 'Conc') {
                        formattedValue = parseFloat(rawValue).toFixed(2) || '0.00'; // 2 decimals
                    } else if (header === 'AvgLibSize') {
                        formattedValue = Math.round(parseFloat(rawValue) || 0); // Whole number
                    } else if (header === 'Clusters') {
                        const numericValue = parseFloat(rawValue) || 0;
                        formattedValue = numericValue ? numericValue.toExponential(2) : '0.00e+0'; // Scientific notation
                        input.dataset.preciseValue = numericValue.toString();
                    } else if (header === '%Flowcell') {
                        const numericValue = parseFloat(rawValue) || 0;
                        formattedValue = Math.round(numericValue); // Whole number
                        input.dataset.preciseValue = numericValue.toString();
                    } else if (header === 'nM') {
                        const numericValue = parseFloat(rawValue) || 0;
                        formattedValue = numericValue ? numericValue.toFixed(1) : '0.0'; // 1 decimal
                        input.dataset.preciseValue = numericValue.toString();
                    } else if (header === '%SamplePerFlowcell') {
                        const numericValue = parseFloat(rawValue) || 0;
                        formattedValue = numericValue ? numericValue.toFixed(1) : '0.0'; // 1 decimal
                        input.dataset.preciseValue = numericValue.toString();
                    } else if (header === 'UI NGS Pool') {
                        const numericValue = parseFloat(rawValue) || 0;
                        formattedValue = numericValue ? numericValue.toFixed(1) : '0.0'; // 1 decimal
                        input.dataset.preciseValue = numericValue.toString();
                    } else {
                        formattedValue = rawValue; // No formatting for other fields like ProjectPool, GenomeSize
                    }

                    if (header === 'ProjectPool') {
                        input.value = formattedValue;
                        input.readOnly = true;
                        input.style.backgroundColor = '#f0f0f0';
                    } else if (['Clusters', '%Flowcell', 'nM', '%SamplePerFlowcell', 'UI NGS Pool'].includes(header)) {
                        input.readOnly = true;
                        input.placeholder = 'Output';
                        input.style.backgroundColor = '#f0f0f0';
                        input.value = formattedValue;
                    } else {
                        input.value = formattedValue;
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
            delBtn.addEventListener('click', async () => {
                const projectPool = rowData.ProjectPool;
                if (confirm(`Are you sure you want to delete ${projectPool}?`)) {
                    try {
                        const response = await fetch('delete_projectpool.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ProjectPool: projectPool })
                        });
                        const result = await response.json();
                        if (result.success) {
                            existingProjectPools.delete(projectPool);
                            tbody.removeChild(newRow);
                            updatePreliminaryFlowcell();
                        } else {
                            showErrorToUser(result.message);
                        }
                    } catch (error) {
                        showErrorToUser('Failed to delete row: ' + error.message);
                    }
                }
            });
            tdAction.appendChild(delBtn);
            newRow.appendChild(tdAction);

            tbody.appendChild(newRow);
            console.log('Row data loaded:', rowData);
        });

        Array.from(tbody.querySelectorAll('tr')).forEach(row => {
            realTimeCalculate(row);
            console.log('Post-calc row:', {
                ProjectPool: getInputValue(row, 'ProjectPool'),
                Clusters: getPreciseValue(row.querySelector('[data-field="Clusters"]')),
                '%Flowcell': getPreciseValue(row.querySelector('[data-field="%Flowcell"]')),
                '%SamplePerFlowcell': getPreciseValue(row.querySelector('[data-field="%SamplePerFlowcell"]')),
                nM: getPreciseValue(row.querySelector('[data-field="nM"]'))
            });
        });
        updateFinalPercentagesAndFlowcell();
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

    const headers = ['ProjectPool', 'Application', 'GenomeSize', 'Coverage', 'SampleCount', 'Conc', 'AvgLibSize', 'Clusters', '%Flowcell', 'nM', '%SamplePerFlowcell', 'UI NGS Pool'];
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
            } else if (['Clusters', '%Flowcell', 'nM', '%SamplePerFlowcell', 'UI NGS Pool'].includes(header)) {
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

function showErrorToUser(message, type = 'error') {
    const errorDiv = document.getElementById('error-messages');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
        errorDiv.style.color = type === 'success' ? '#155724' : '#721c24';
        errorDiv.style.padding = '10px';
        errorDiv.style.borderRadius = '5px';
        errorDiv.style.marginTop = '10px';
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
    const genomeSize = parseFloat(getInputValue(row, 'GenomeSize')) || 0;
    const coverage = parseFloat(getInputValue(row, 'Coverage')) || 0;
    const sampleCount = parseInt(getInputValue(row, 'SampleCount')) || 0;
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

    const percentageHeader = document.querySelector('#spreadsheetTable th[data-field="%Flowcell"]');
    if (percentageHeader) percentageHeader.textContent = `%${overallFlowcell}`;
}

function getInputValue(row, fieldName) {
    const input = row.querySelector(`[data-field="${fieldName}"]`);
    if (!input) return '';
    return input.tagName === 'SELECT' ? input.value : input.value.trim();
}

const preliminaryRequiredFields = ['Application', 'GenomeSize', 'Coverage', 'SampleCount', 'Conc', 'AvgLibSize'];

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

    const conc = parseFloat(getInputValue(row, 'Conc')) || 0;
    const avgLibSize = parseFloat(getInputValue(row, 'AvgLibSize')) || 0;
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
        const sampleCount = parseInt(getInputValue(row, 'SampleCount')) || 0;
        const percentageOfFlowcell = totalClusters > 0 ? (clusters * 100) / flowcellMax : 0;
        const percentagePerSample = sampleCount > 0 && totalClusters > 0 ? (clusters * 100) / (sampleCount * flowcellMax) : 0;
        return { row, clusters, percentageOfFlowcell, percentagePerSample };
    });

    rowCalculations.forEach(({ row, percentageOfFlowcell, percentagePerSample }) => {
        const percentFlowcellInput = row.querySelector('[data-field="%Flowcell"]');
        if (percentFlowcellInput) {
            percentFlowcellInput.dataset.preciseValue = percentageOfFlowcell.toString();
            percentFlowcellInput.value = percentageOfFlowcell.toFixed(1) + '%';
        }
        const percentSampleInput = row.querySelector('[data-field="%SamplePerFlowcell"]');
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

function updateProgressBarAndLegend(rowCalculations, flowcellMax) {
    const progressBar = document.getElementById('flowcellProgress');
    const progressPercentage = document.getElementById('progressPercentage');
    const legendContainer = document.getElementById('progressLegend');

    if (!progressBar || !progressPercentage || !legendContainer) {
        console.warn('Progress bar, percentage, or legend elements not found in the DOM');
        return;
    }

    progressBar.innerHTML = '';
    legendContainer.innerHTML = '';

    const totalPercentage = rowCalculations.reduce((sum, { percentageOfFlowcell }) => sum + percentageOfFlowcell, 0);

    let cumulativeWidth = 0;
    rowCalculations.forEach(({ row, percentageOfFlowcell }) => {
        const projectPool = getInputValue(row, 'ProjectPool');
        const color = getColorForProjectPool(projectPool);
        const width = percentageOfFlowcell;

        const segment = document.createElement('div');
        segment.className = 'progress-segment';
        segment.style.width = `${width}%`;
        segment.style.backgroundColor = color;
        segment.title = `${projectPool}: ${percentageOfFlowcell.toFixed(1)}%`;
        progressBar.appendChild(segment);

        cumulativeWidth += width;

        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <span class="legend-color" style="background-color: ${color};"></span>
            ${projectPool}: ${percentageOfFlowcell.toFixed(1)}%
        `;
        legendContainer.appendChild(legendItem);
    });

    progressBar.style.width = `${Math.min(totalPercentage, 100)}%`;
    progressPercentage.textContent = `${totalPercentage.toFixed(1)}%`;

    if (totalPercentage > 100) {
        showErrorToUser(`Warning: Total flowcell usage exceeds 100% (${totalPercentage.toFixed(1)}%)`);
    }
}

async function calculateAndSaveAllData() {
    console.log('Starting calculateAndSaveAllData');
    const rows = document.querySelectorAll('#spreadsheetTable tbody tr');

    // Step 1: Calculate all fields
    const totalClusters = Array.from(rows).reduce((sum, row) => {
        realTimeCalculate(row); // Ensure all calculations are up-to-date
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

    document.getElementById('trisOutput').textContent = `ul Tris aan pool toevoegen: ${trisToAdd.toFixed(1)}`;

    // Step 2: Prepare all data for saving
    const runSelect = document.getElementById('runSelect');
    const newRunNameInput = document.getElementById('newRunNameInput');
    const runName = runSelect.value === 'new' ? newRunNameInput.value.trim() : runSelect.value;

    if (!runName) {
        showErrorToUser('Please select an existing run or enter a new run name.');
        return;
    }

    const allData = [];
    rows.forEach(row => {
        const data = {
            RunName: runName,
            ProjectPool: getInputValue(row, 'ProjectPool'),
            Application: getInputValue(row, 'Application'),
            GenomeSize: parseInt(getInputValue(row, 'GenomeSize')) || 0,
            Coverage: parseFloat(getInputValue(row, 'Coverage')) || 0,
            SampleCount: parseInt(getInputValue(row, 'SampleCount')) || 0,
            Conc: parseFloat(getInputValue(row, 'Conc')) || 0,
            AvgLibSize: parseInt(getInputValue(row, 'AvgLibSize')) || 0,
            Clusters: parseFloat(getPreciseValue(row.querySelector('[data-field="Clusters"]'))) || 0,
            '%Flowcell': parseFloat(getPreciseValue(row.querySelector('[data-field="%Flowcell"]'))) || 0,
            nM: parseFloat(getPreciseValue(row.querySelector('[data-field="nM"]'))) || 0,
            '%SamplePerFlowcell': parseFloat(getPreciseValue(row.querySelector('[data-field="%SamplePerFlowcell"]'))) || 0,
            'UI NGS Pool': parseFloat(getPreciseValue(row.querySelector('[data-field="UI NGS Pool"]'))) || 0
        };
        allData.push(data);
    });

    // Step 3: Validate all data
    let allValid = true;
    allData.forEach(data => {
        const requiredFields = ['ProjectPool', 'Application', 'GenomeSize', 'Coverage', 'SampleCount', 'Conc', 'AvgLibSize'];
        requiredFields.forEach(field => {
            if (!data[field] || data[field] === 0) {
                showErrorToUser(`Missing or invalid value for ${field} in row ${data.ProjectPool}`);
                allValid = false;
            }
        });
    });

    if (!allValid) {
        showErrorToUser('Please fill all required fields in all rows.');
        return;
    }

    // Step 4: Save all data
    if (confirm(`Are you sure you want to save all data for run "${runName}"?`)) {
        console.log('Saving all data:', JSON.stringify({ runName: runName, rows: allData }));
        try {
            const response = await fetch('save_all_data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ runName: runName, rows: allData })
            });
            const result = await response.json();
            if (result.success) {
                showErrorToUser('All data saved successfully!', 'success');
                existingProjectPools = new Set(allData.map(row => row.ProjectPool)); // Update local cache
            } else {
                showErrorToUser('Failed to save data: ' + result.message);
            }
        } catch (error) {
            showErrorToUser('Error saving data: ' + error.message);
        }
    }
}

async function saveCalculations() {
    const rows = document.querySelectorAll('#spreadsheetTable tbody tr');
    let allSaved = true;

    console.log('Starting saveCalculations for', rows.length, 'rows');

    for (const row of rows) {
        const data = {
            ProjectPool: getInputValue(row, 'ProjectPool'),
            Clusters: getPreciseValue(row.querySelector('[data-field="Clusters"]')),
            '%Flowcell': parseFloat(row.querySelector('[data-field="%Flowcell"]').dataset.preciseValue) || 0,
            nM: getPreciseValue(row.querySelector('[data-field="nM"]')),
            '%SamplePerFlowcell': parseFloat(row.querySelector('[data-field="%SamplePerFlowcell"]').dataset.preciseValue) || 0,
            'UI_NGS_Pool': getPreciseValue(row.querySelector('[data-field="UI NGS Pool"]')) || 0
        };

        data.Clusters = parseInt(data.Clusters);
        data['%Flowcell'] = parseFloat(data['%Flowcell']).toFixed(2);
        data.nM = parseFloat(data.nM).toFixed(4);
        data['%SamplePerFlowcell'] = parseFloat(data['%SamplePerFlowcell']).toFixed(2);
        data['UI_NGS_Pool'] = parseFloat(data['UI_NGS_Pool']).toFixed(2);

        console.log('Data sent to update_calculations.php:', JSON.stringify(data));

        try {
            const response = await fetch('update_calculations.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(data)
            });
            const responseText = await response.text();
            console.log('Raw server response from update_calculations.php:', responseText);

            if (!response.ok) {
                throw new Error(`Server error: ${response.status} - ${responseText}`);
            }
            const result = JSON.parse(responseText);
            if (!result.success) {
                throw new Error(result.message || 'Unknown error');
            }
            console.log(`Successfully updated calculations for ${data.ProjectPool}`);
        } catch (error) {
            console.error(`Error saving calculations for ${data.ProjectPool}:`, error);
            showErrorToUser(`Error saving calculations for ${data.ProjectPool}: ${error.message}`);
            allSaved = false;
        }
    }

    return allSaved;
}

document.addEventListener('DOMContentLoaded', async () => {
    await fetchExistingProjectPools();
    const runNames = await fetchRunNames();
    const runSelect = document.getElementById('runSelect');
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
        await calculateAndSaveAllData();
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

    await addRow();
});