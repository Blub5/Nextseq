document.addEventListener('DOMContentLoaded', function() {
    const tableSelect = document.getElementById('tableSelect');
    const refreshBtn = document.getElementById('refreshBtn');
    const exportBtn = document.getElementById('exportBtn');
    const searchInput = document.getElementById('searchInput');
    const tableContainer = document.getElementById('tableContainer');
    
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
            tableContainer.innerHTML = '<div class="loading">Loading data...</div>';
            
            const response = await fetch('get_table_data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table: tableName, sortColumn: currentSort.column, sortDirection: currentSort.direction })
            });

            if (!response.ok) throw new Error('Failed to fetch data.');

            const data = await response.json();
            if (!data.success) throw new Error(data.message);

            tableData = data.data;
            displayTable(tableData, data.columns);
        } catch (error) {
            tableContainer.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        }
    }

    function displayTable(data, columns) {
        if (!data.length) {
            tableContainer.innerHTML = '<div>No data available</div>';
            return;
        }
    
        const table = document.createElement('table');
        table.id = "dataTable";
        table.style.width = "100%";  
        table.style.tableLayout = "fixed";  // Prevents table from expanding too much
    
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
    
        columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column;
            th.className = 'sort-icon';
            th.style.fontSize = "13px"; // Smaller header text
            if (column === currentSort.column) {
                th.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
            }
            th.addEventListener('click', () => handleSort(column));
            headerRow.appendChild(th);
        });
    
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
                }
    
                td.textContent = value ?? '';
                td.style.fontSize = "13px"; // Smaller text for better fit
                td.style.wordWrap = "break-word"; 
                td.style.whiteSpace = "normal"; // Allows text to wrap
    
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    
        table.appendChild(tbody);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(table);
    }
    

    function filterTable() {
        const query = searchInput.value.toLowerCase();
        const rows = document.querySelectorAll("#dataTable tbody tr");
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
        if (!tableData.length) return alert('No data to export.');
        
        const columns = Object.keys(tableData[0]);
    
        // Convert data to CSV format with semicolon (;) delimiter
        const csvContent = [
            columns.join(';'), // Headers
            ...tableData.map(row =>
                columns.map(column => {
                    let value = row[column];
    
                    // Format timestamp
                    if (column === 'timestamp') {
                        const dateObj = new Date(value);
                        value = dateObj.toLocaleString('nl-NL', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                        });
                        value = value.padEnd(25);
                    }
                    // Format Clusters in scientific notation
                    else if (column === 'Clusters') {
                        value = parseFloat(value).toExponential(2);
                    }
                    // Round %(Flowcell) to integer
                    else if (column === '%(Flowcell)') {
                        value = Math.round(parseFloat(value));
                    }
                    // Format nM to 1 decimal
                    else if (column === 'nM') {
                        value = parseFloat(value).toFixed(1);
                    }
                    // Handle strings and other numbers
                    else {
                        if (typeof value === 'string') {
                            value = `"${value.replace(/"/g, '""')}"`; // Escape quotes
                        } else if (typeof value === 'number') {
                            value = value.toLocaleString('en-US', { minimumFractionDigits: 2 });
                        }
                    }
    
                    return value;
                }).join(';') // Use semicolon as delimiter
            )
        ].join('\n');
    
        // Create and download the CSV file with UTF-8 BOM (for Excel support)
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${tableSelect.value}.csv`;
        a.click();
    }
});
