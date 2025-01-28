const existingProjectsDB = [
    { project: "NGS-123", application: "WGS" },
    { project: "NGS-456", application: "RNAseq" },
    { project: "NGS-789", application: "MGX" }
];

const projectTableBody = document.querySelector("#projectTable tbody");

function prependNGS() {
    const projectField = document.getElementById('project');
    if (!projectField.value.startsWith("NGS-")) {
        projectField.value = "NGS-" + projectField.value;
    }
}

async function checkProjectInDatabase(project) {
 
    return new Promise((resolve) => {
        setTimeout(() => {
            const isDuplicate = existingProjectsDB.some(entry => entry.project === project);
            resolve(isDuplicate);
        }, 1000); 
    });
}

async function performCalculationsAndSubmit() {
    const project = document.getElementById('project').value.trim();
    const application = document.getElementById('application').value;

  
    const existingProjectsInTable = Array.from(projectTableBody.querySelectorAll('tr')).map(
        row => row.cells[1].textContent
    );

    if (existingProjectsInTable.includes(project)) {
        alert('ProjectPool already exists in the table!');
        return;
    }


    const isDuplicateInDB = await checkProjectInDatabase(project);
    if (isDuplicateInDB) {
        alert('ProjectPool already exists in the database!');
        return;
    }

    const size = parseFloat(document.getElementById('size').value);
    const coverage = parseFloat(document.getElementById('coverage').value);
    const sampleCount = parseFloat(document.getElementById('sampleCount').value);
    const cycli = parseInt(document.getElementById('cycli').value);
    const conc = parseFloat(document.getElementById('conc').value.replace(',', '.'));
    const avgLibSize = parseFloat(document.getElementById('avgLibSize').value);

    if (isNaN(size) || isNaN(coverage) || isNaN(sampleCount) || isNaN(conc) || isNaN(avgLibSize)) {
        alert('Voer geldige numerieke waarden in.');
        return;
    }

    const factor1 = (cycli === 300) ? 270 : 450;
    let clusters;

    switch (application) {
        case "WGS":
            clusters = (size * coverage * sampleCount) / factor1;
            break;
        case "RNAseq":
        case "Amplicon":
        case "MGX":
            clusters = coverage * sampleCount;
            break;
        default:
            clusters = 0;
    }

    clusters = clusters.toExponential(2);

    const nM = (conc * 1000) / (649 * avgLibSize) * 1000;

    addRowToTable(project, application, clusters, nM.toFixed(1));


    existingProjectsDB.push({ project, application });
    alert('ProjectPool successfully added!');
}

function addRowToTable(project, application, clusters, nM) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="checkbox" class="row-select"></td>
        <td>${project}</td>
        <td>${application}</td>
        <td>${clusters}</td>
        <td>${nM}</td>
    `;
    projectTableBody.appendChild(row);
}

function calculateFlowcellForSelected() {
    const rows = document.querySelectorAll('#projectTable tbody tr');
    let totalClusters = 0;

    rows.forEach(row => {
        const checkbox = row.querySelector('.row-select');
        if (checkbox.checked) {
            const clusters = parseFloat(row.cells[3].textContent);
            totalClusters += clusters;
        }
    });

    const flowcellOptions = [
        { name: "P1", maxClusters: 100000000 },
        { name: "P2", maxClusters: 400000000 },
        { name: "P3", maxClusters: 1200000000 },
        { name: "P4", maxClusters: 1800000000 }
    ];

    const selectedFlowcell = flowcellOptions.find(option => totalClusters <= option.maxClusters);

    if (selectedFlowcell) {
        alert(`Selected Flowcell: ${selectedFlowcell.name}`);
    } else {
        alert("The total clusters exceed the capacity of all available flowcells.");
    }
}

let lastScrollTop = 0;
const navbar = document.querySelector('.header');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    navbar.style.top = currentScroll > lastScrollTop ? "-100px" : "0";
    lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
});