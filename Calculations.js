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

    const molarityInM = desiredMolarity * MOLARITY_CONVERSIONS[molarityUnit];
    const volumeInL = volume * VOLUME_CONVERSIONS[volumeUnit];
    const requiredMassGrams = molarityInM * volumeInL * molecularWeight;
    
    // Convert grams to micrograms and format
    const requiredMassMicrograms = requiredMassGrams * 1000000; // 1g = 1e6 μg
    document.getElementById('massResult').textContent = 
        `Required Mass: ${requiredMassMicrograms.toFixed(3)} μg`;
}