document.addEventListener('DOMContentLoaded', function() {
    const tableSelect = document.getElementById('tableSelect');
    const refreshBtn = document.getElementById('refreshBtn');
    const searchInput = document.getElementById('searchInput');
    const tableContainer = document.getElementById('tableContainer');
    const errorDiv = document.getElementById('error-messages');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');

    // Advanced state management
    const state = {
        currentTable: 'mixdiffpools',
        currentPage: 1,
        pageSize: 50,
        totalPages: 1,
        currentSort: { column: 'timestamp', direction: 'desc' },
        filters: {},
        visibleColumns: []
    };

    // Utility Functions
    function debounce(func, delay) {
        let timeoutId;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(context, args), delay);
        };
    }

    function showError(message, type = 'error') {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.style.backgroundColor = type === 'success' ? '#4caf50' : '#f44336';
        setTimeout(() => errorDiv.style.display = 'none', 5000);
    }

    // Data Fetching with Pagination
    async function loadTableData() {
        try {
            tableContainer.innerHTML = '<div class="loading">Loading data...</div>';
            
            const response = await fetch('../PHP_Files/get_table_data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table: state.currentTable,
                    page: state.currentPage,
                    pageSize: state.pageSize,
                    sortColumn: state.currentSort.column,
                    sortDirection: state.currentSort.direction,
                    filters: state.filters
                })
            });

            if (!response.ok) throw new Error('Failed to fetch data.');

            const data = await response.json();
            if (!data.success) throw new Error(data.message);

            state.totalPages = Math.ceil(data.total / state.pageSize);
            updatePaginationControls();
            displayTable(data.data, data.columns);
        } catch (error) {
            showError(error.message);
        }
    }

    function updatePaginationControls() {
        prevPageBtn.disabled = state.currentPage === 1;
        nextPageBtn.disabled = state.currentPage === state.totalPages;
        pageInfo.textContent = `Page ${state.currentPage} of ${state.totalPages}`;
    }

    function displayTable(data, columns) {
        if (!data.length) {
            tableContainer.innerHTML = '<div>No data available</div>';
            return;
        }

        const table = document.createElement('table');
        table.classList.add('responsive-table');

        // Enhanced table rendering logic
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column;
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
                // Enhanced data formatting
                let value = formatCellValue(row[column], column);
                td.textContent = value ?? '';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(table);
    }

    function formatCellValue(value, column) {
        if (value === null || value === undefined) return '';
        
        switch(column) {
            case 'timestamp':
                return new Date(value).toLocaleString('nl-NL');
            case 'Coverage':
            case '%Flowcell':
                return Math.round(parseFloat(value) || 0);
            case 'Conc':
                return parseFloat(value).toFixed(2);
            case 'Clusters':
                return parseFloat(value).toExponential(2);
            default:
                return value;
        }
    }

    function handleSort(column) {
        state.currentSort.direction = 
            (state.currentSort.column === column && state.currentSort.direction === 'asc') 
            ? 'desc' 
            : 'asc';
        state.currentSort.column = column;
        loadTableData();
    }

    // Event Listeners
    tableSelect.addEventListener('change', () => {
        state.currentTable = tableSelect.value;
        state.currentPage = 1;
        loadTableData();
    });

    refreshBtn.addEventListener('click', loadTableData);

    prevPageBtn.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            loadTableData();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (state.currentPage < state.totalPages) {
            state.currentPage++;
            loadTableData();
        }
    });

    searchInput.addEventListener('input', debounce(function() {
        const query = this.value.toLowerCase();
        state.filters = { global: query };
        state.currentPage = 1;
        loadTableData();
    }, 300));

    // Initial data load
    loadTableData();
});