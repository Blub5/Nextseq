const VOLUME_CONVERSIONS = {
    'L': 1,
    'ml': 0.001,
    'μl': 1e-6,
    'nl': 1e-9,
    'pl': 1e-12,
    'fl': 1e-15
};

const MOLARITY_CONVERSIONS = {
    'M': 1,
    'mM': 1e-3,
    'μM': 1e-6,
    'nM': 1e-9,
    'pM': 1e-12,
    'fM': 1e-15
};

const MASS_CONVERSIONS = {
    'kg': 1000,
    'g': 1,
    'mg': 1e-3,
    'μg': 1e-6,
    'ng': 1e-9,
    'pg': 1e-12
};

// Function to format mass with appropriate unit
function formatMass(massInGrams) {
    if (massInGrams >= 1) return `${massInGrams.toFixed(3)} g`;
    if (massInGrams >= 1e-3) return `${(massInGrams * 1e3).toFixed(3)} mg`;
    if (massInGrams >= 1e-6) return `${(massInGrams * 1e6).toFixed(3)} μg`;
    if (massInGrams >= 1e-9) return `${(massInGrams * 1e9).toFixed(3)} ng`;
    if (massInGrams >= 1e-12) return `${(massInGrams * 1e12).toFixed(3)} pg`;
    return `${(massInGrams * 1e15).toFixed(3)} fg`;
}

// Function to format molarity with appropriate unit
function formatMolarity(molarityInM) {
    if (molarityInM >= 1) return `${molarityInM.toFixed(3)} M`;
    if (molarityInM >= 1e-3) return `${(molarityInM * 1e3).toFixed(3)} mM`;
    if (molarityInM >= 1e-6) return `${(molarityInM * 1e6).toFixed(3)} μM`;
    if (molarityInM >= 1e-9) return `${(molarityInM * 1e9).toFixed(3)} nM`;
    if (molarityInM >= 1e-12) return `${(molarityInM * 1e12).toFixed(3)} pM`;
    return `${(molarityInM * 1e15).toFixed(3)} fM`;
}

function calculateRequiredMass() {
    const molecularWeight = parseFloat(document.getElementById('molecularWeight').value);
    const desiredMolarity = parseFloat(document.getElementById('desiredMolarity').value);
    const volume = parseFloat(document.getElementById('volume').value);
    const molarityUnit = document.getElementById('molarityUnit').value;
    const volumeUnit = document.getElementById('volumeUnit').value;

    if (!molecularWeight || !desiredMolarity || !volume) {
        document.getElementById('massResult').textContent = 'Please fill in all fields';
        return;
    }

    // Convert to base units (mol/L and L)
    const molarityInM = desiredMolarity * MOLARITY_CONVERSIONS[molarityUnit];
    const volumeInL = volume * VOLUME_CONVERSIONS[volumeUnit];

    // Calculate mass in grams
    const requiredMassGrams = molarityInM * volumeInL * molecularWeight;

    // Format the result with appropriate unit
    document.getElementById('massResult').textContent = 
        `Required Mass: ${formatMass(requiredMassGrams)}`;
}

function calculateMolarity() {
    const molecularWeight = parseFloat(document.getElementById('molarityMW').value);
    const mass = parseFloat(document.getElementById('mass').value);
    const volume = parseFloat(document.getElementById('molarityVolume').value);
    const massUnit = document.getElementById('massUnit').value;
    const volumeUnit = document.getElementById('molarityVolumeUnit').value;

    if (!molecularWeight || !mass || !volume) {
        document.getElementById('molarityResult').textContent = 'Please fill in all fields';
        return;
    }

    // Convert mass to grams
    const massInGrams = mass * MASS_CONVERSIONS[massUnit];
    
    // Convert volume to liters
    const volumeInL = volume * VOLUME_CONVERSIONS[volumeUnit];
    
    // Calculate molarity in M
    const molarityInM = massInGrams / (volumeInL * molecularWeight);
    
    document.getElementById('molarityResult').textContent = 
        `Molarity: ${formatMolarity(molarityInM)}`;
}