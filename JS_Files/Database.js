document.addEventListener('DOMContentLoaded', function() {
    const tableSelect = document.getElementById('tableSelect');
    const refreshBtn = document.getElementById('refreshBtn');
    const exportBtn = document.getElementById('exportBtn');
    const searchInput = document.getElementById('searchInput');
    const tableContainer = document.getElementById('tableContainer');
    const errorDiv = document.getElementById('error-messages');

    let currentSort = { column: 'timestamp', direction: 'desc' };
    let tableData = [];

    loadTableData(tableSelect.value);

    tableSelect.addEventListener('change', () => {
        currentSort = { column: 'timestamp', direction: 'desc' };
        loadTableData(tableSelect.value);
    });

    refreshBtn.addEventListener('click', () => loadTableData(tableSelect.value));
    searchInput.addEventListener('input', filterTable);
    exportBtn.addEventListener('click', exportToCSV);

    async function loadTableData(tableName) {
        try {
            tableContainer.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
            const response = await fetch('../PHP_Files/get_table_data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table: tableName, sortColumn: currentSort.column, sortDirection: currentSort.direction })
            });

            if (!response.ok) throw new Error('Failed to fetch data.');
            const data = await response.json();
            if (!data.success) throw new Error(data.message);

            tableData = data.data;
            displayTable(tableData, data.columns, tableName);
        } catch (error) {
            showError(error.message);
        }
    }

    function displayTable(data, columns, tableName) {
        if (!data.length) {
            tableContainer.innerHTML = '<div class="alert alert-info text-center">No data available</div>';
            return;
        }

        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'table-responsive';

        const table = document.createElement('table');
        table.id = 'dataTable';
        table.className = 'table table-striped table-hover table-bordered';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column;
            th.className = 'sort-icon';
            if (column === currentSort.column) {
                th.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
            }
            th.addEventListener('click', () => handleSort(column));
            headerRow.appendChild(th);
        });

        const actionTh = document.createElement('th');
        actionTh.textContent = 'Actions';
        headerRow.appendChild(actionTh);
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        data.forEach(row => {
            const tr = document.createElement('tr');
            columns.forEach(column => {
                const td = document.createElement('td');
                let value = row[column];

                if (column === 'timestamp') {
                    const dateObj = new Date(value);
                    value = dateObj.toLocaleString('nl-NL', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                    });
                } else if (column === 'Coverage') {
                    value = Math.round(parseFloat(value) || 0);
                } else if (column === 'SampleCount') {
                    value = Math.round(parseFloat(value) || 0);
                } else if (column === 'Conc') {
                    value = parseFloat(value).toFixed(2) || '0.00';
                } else if (column === 'AvgLibSize') {
                    value = Math.round(parseFloat(value) || 0);
                } else if (column === 'Clusters') {
                    const numericValue = parseFloat(value) || 0;
                    value = numericValue ? numericValue.toExponential(2) : '0.00e+0';
                } else if (column === '%Flowcell') {
                    value = Math.round(parseFloat(value) || 0);
                } else if (column === 'nM') {
                    value = parseFloat(value).toFixed(1) || '0.0';
                } else if (column === '%SamplePerFlowcell') {
                    value = parseFloat(value).toFixed(1) || '0.0';
                } else if (column === 'UI NGS Pool') {
                    value = parseFloat(value).toFixed(1) || '0.0';
                }

                td.textContent = value ?? '';
                tr.appendChild(td);
            });

            const actionTd = document.createElement('td');
            if (tableName === 'mixdiffpools') {
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.className = 'btn btn-danger btn-sm';
                deleteBtn.addEventListener('click', () => deleteRow(row.ProjectPool));
                actionTd.appendChild(deleteBtn);
            }
            tr.appendChild(actionTd);
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        tableWrapper.appendChild(table);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(tableWrapper);
    }

    async function deleteRow(projectPool) {
        if (!confirm(`Are you sure you want to delete ProjectPool ${projectPool}?`)) return;

        try {
            const response = await fetch('../PHP_Files/delete_projectpool.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ProjectPool: projectPool })
            });

            if (!response.ok) throw new Error('Failed to delete row.');
            const result = await response.json();
            if (!result.success) throw new Error(result.message);

            showError(`Row with ProjectPool ${projectPool} deleted successfully`, 'success');
            loadTableData(tableSelect.value);
        } catch (error) {
            showError(`Error deleting row: ${error.message}`);
        }
    }

    function filterTable() {
        const query = searchInput.value.toLowerCase();
        const rows = document.querySelectorAll('#dataTable tbody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
        });
    }

    function handleSort(column) {
        currentSort.direction = (currentSort.column === column && currentSort.direction === 'asc') ? 'desc' : 'asc';
        currentSort.column = column;
        loadTableData(tableSelect.value);
    }

    function exportToCSV() {
        if (!tableData.length) return showError('No data to export.');
        const columns = Object.keys(tableData[0]);
        const csvContent = [
            columns.join(';'),
            ...tableData.map(row =>
                columns.map(column => {
                    let value = row[column];
                    if (column === 'timestamp') {
                        const dateObj = new Date(value);
                        value = dateObj.toLocaleString('nl-NL', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                        });
                    } else if (column === 'Clusters') {
                        value = parseFloat(value).toExponential(2);
                    } else if (column === '%Flowcell') {
                        value = Math.round(parseFloat(value));
                    } else if (column === 'nM') {
                        value = parseFloat(value).toFixed(1);
                    } else {
                        if (typeof value === 'string') value = `"${value.replace(/"/g, '""')}"`;
                        else if (typeof value === 'number') value = value.toLocaleString('en-US', { minimumFractionDigits: 2 });
                    }
                    return value;
                }).join(';')
            )
        ].join('\n');

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${tableSelect.value}.csv`;
        a.click();
    }

    function showError(message, type = 'error') {
        if (errorDiv) {
            errorDiv.className = `alert ${type === 'success' ? 'alert-success' : 'alert-danger'}`;
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => errorDiv.style.display = 'none', 5000);
        }
    }
});