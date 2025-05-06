// API Base URL
const API_BASE_URL = '/api';

// DOM Elements
const loginContainer = document.getElementById('loginContainer');
const adminContainer = document.getElementById('adminContainer');
const loginError = document.getElementById('loginError');
const triggerAuthBtn = document.getElementById('triggerAuthBtn');
const systemInstructionsList = document.getElementById('systemInstructionsList');
const visibleInstructionsList = document.getElementById('visibleInstructionsList');
const addSystemInstructionForm = document.getElementById('addSystemInstructionForm');
const addVisibleInstructionForm = document.getElementById('addVisibleInstructionForm');
const systemInstructionInput = document.getElementById('systemInstructionInput');
const visibleInstructionInput = document.getElementById('visibleInstructionInput');
const refreshSystemBtn = document.getElementById('refreshSystemBtn');
const refreshVisibleBtn = document.getElementById('refreshVisibleBtn');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication status
    checkAuthenticationStatus();
    
    // Trigger authentication button
    if (triggerAuthBtn) {
        triggerAuthBtn.addEventListener('click', triggerAuthentication);
    }
    
    // Refresh buttons
    if (refreshSystemBtn) {
        refreshSystemBtn.addEventListener('click', loadSystemInstructions);
    }
    
    if (refreshVisibleBtn) {
        refreshVisibleBtn.addEventListener('click', loadVisibleInstructions);
    }
    
    // Add instruction forms
    if (addSystemInstructionForm) {
        addSystemInstructionForm.addEventListener('submit', handleAddSystemInstruction);
    }
    
    if (addVisibleInstructionForm) {
        addVisibleInstructionForm.addEventListener('submit', handleAddVisibleInstruction);
    }
});

// Authentication Functions
async function checkAuthenticationStatus() {
    try {
        // Use the dedicated auth check endpoint
        const response = await fetch(`${API_BASE_URL}/auth/check`, {
            method: 'GET', // Use GET for the dedicated endpoint
            credentials: 'include' // Important: include credentials for auth
        });

        if (response.ok) { // Check for 200 OK from the dedicated endpoint
            // If we can access the protected endpoint, we're authenticated
            showAdminPanel();
        } else if (response.status === 401 || response.status === 403) {
            // If we get 401 Unauthorized or 403 Forbidden, we're not authenticated
            // The login container is already visible by default, so we don't need to do anything
            console.log('Not authenticated. Please log in.');
        } else {
            console.error('Unexpected response when checking authentication:', response.status);
            loginError.textContent = `Debug: Unexpected auth check status: ${response.status}`; // Add user-visible debug info
        }
    } catch (error) {
        console.error('Error checking authentication status:', error);
        loginError.textContent = `Debug: Error during auth check: ${error.message}`; // Add user-visible debug info
    }
}

function triggerAuthentication() {
    // Use the dedicated auth check endpoint to trigger the dialog
    fetch(`${API_BASE_URL}/auth/check`, {
        method: 'GET', // Use GET for the dedicated endpoint
        credentials: 'include',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    }).then(response => {
        if (response.ok) { // Check for 200 OK
            showAdminPanel();
        }
        // No need to handle 405 anymore
    });
}

function showAdminPanel() {
    console.log('Debug: showAdminPanel() called.'); // Log when function is called
    if (loginContainer && adminContainer) {
        console.log('Debug: Hiding login container, showing admin container.'); // Log container switch
        loginContainer.style.display = 'none';
        adminContainer.style.display = 'block';
        
        // Load instructions
        loadSystemInstructions();
        loadVisibleInstructions();
    }
}

// API Functions
async function loadSystemInstructions() {
    try {
        // Use the debug endpoint to get all instructions
        const response = await fetch(`${API_BASE_URL}/instructions/debug`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const instructions = await response.json();
        
        // Filter for hidden instructions
        const hiddenInstructions = instructions.filter(instr => instr.hidden === true);
        
        renderInstructions(systemInstructionsList, hiddenInstructions, true);
    } catch (error) {
        console.error('Error loading system instructions:', error);
        systemInstructionsList.innerHTML = '<div class="instruction-item"><span class="instruction-text">Error loading system instructions</span></div>';
    }
}

async function loadVisibleInstructions() {
    try {
        // Use the debug endpoint to get all instructions
        const response = await fetch(`${API_BASE_URL}/instructions/debug`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const instructions = await response.json();
        
        // Filter for visible instructions
        const visibleInstructions = instructions.filter(instr => instr.hidden === false);
        
        renderInstructions(visibleInstructionsList, visibleInstructions, false);
    } catch (error) {
        console.error('Error loading visible instructions:', error);
        visibleInstructionsList.innerHTML = '<div class="instruction-item"><span class="instruction-text">Error loading visible instructions</span></div>';
    }
}

async function addInstruction(instructionText, isHidden) {
    try {
        // For hidden instructions, use a special endpoint
        const endpoint = isHidden ? 
            `${API_BASE_URL}/instructions/add-hidden` : 
            `${API_BASE_URL}/instructions`;
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ instructionText: instructionText }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error adding instruction:', error);
        return null;
    }
}

async function toggleInstructionVisibility(id, currentlyHidden) {
    try {
        const response = await fetch(`${API_BASE_URL}/instructions/${id}/toggle-visibility`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ hidden: !currentlyHidden }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error toggling instruction visibility for ID ${id}:`, error);
        return null;
    }
}

async function deleteInstruction(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/instructions/${id}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return true;
    } catch (error) {
        console.error(`Error deleting instruction ${id}:`, error);
        return false;
    }
}

// Event Handlers
async function handleAddSystemInstruction(event) {
    event.preventDefault();
    
    const instructionText = systemInstructionInput.value.trim();
    if (!instructionText) return;
    
    systemInstructionInput.disabled = true;
    
    const savedInstruction = await addInstruction(instructionText, true);
    
    systemInstructionInput.disabled = false;
    
    if (savedInstruction) {
        systemInstructionInput.value = '';
        loadSystemInstructions();
    } else {
        alert('Error adding system instruction');
    }
}

async function handleAddVisibleInstruction(event) {
    event.preventDefault();
    
    const instructionText = visibleInstructionInput.value.trim();
    if (!instructionText) return;
    
    visibleInstructionInput.disabled = true;
    
    const savedInstruction = await addInstruction(instructionText, false);
    
    visibleInstructionInput.disabled = false;
    
    if (savedInstruction) {
        visibleInstructionInput.value = '';
        loadVisibleInstructions();
    } else {
        alert('Error adding visible instruction');
    }
}

async function handleToggleVisibility(id, currentlyHidden) {
    const success = await toggleInstructionVisibility(id, currentlyHidden);
    
    if (success) {
        // Reload both lists since an instruction moved between them
        loadSystemInstructions();
        loadVisibleInstructions();
    } else {
        alert(`Error toggling visibility for instruction ${id}`);
    }
}

async function handleDeleteInstruction(id, isHidden) {
    if (confirm('Are you sure you want to delete this instruction?')) {
        const success = await deleteInstruction(id);
        
        if (success) {
            // Reload the appropriate list
            if (isHidden) {
                loadSystemInstructions();
            } else {
                loadVisibleInstructions();
            }
        } else {
            alert(`Error deleting instruction ${id}`);
        }
    }
}

// Rendering Functions
function renderInstructions(container, instructions, isHidden) {
    container.innerHTML = '';
    
    if (instructions.length === 0) {
        container.innerHTML = `<div class="instruction-item">
            <span class="instruction-text">No ${isHidden ? 'system' : 'visible'} instructions found</span>
        </div>`;
        return;
    }
    
    instructions.forEach(instr => {
        const item = document.createElement('div');
        item.className = 'instruction-item';
        
        // Create badge
        const badge = document.createElement('span');
        badge.className = isHidden ? 'hidden-badge' : 'visible-badge';
        badge.textContent = isHidden ? 'Hidden' : 'Visible';
        
        // Create text
        const text = document.createElement('span');
        text.className = 'instruction-text';
        text.textContent = instr.text;
        
        // Create actions
        const actions = document.createElement('div');
        actions.className = 'instruction-actions';
        
        // Toggle visibility button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'button-style';
        toggleBtn.textContent = isHidden ? 'Make Visible' : 'Hide';
        toggleBtn.onclick = () => handleToggleVisibility(instr.id, isHidden);
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'button-style';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => handleDeleteInstruction(instr.id, isHidden);
        
        // Assemble the item
        actions.appendChild(toggleBtn);
        actions.appendChild(deleteBtn);
        
        item.appendChild(badge);
        item.appendChild(text);
        item.appendChild(actions);
        
        container.appendChild(item);
    });
}
// --- Model Selection ---

// DOM Elements for Model Selection
const currentModelDisplay = document.getElementById('currentModelDisplay');
const modelSearchInput = document.getElementById('modelSearchInput');
const modelSelect = document.getElementById('modelSelect');
const saveModelBtn = document.getElementById('saveModelBtn');
const modelSaveStatus = document.getElementById('modelSaveStatus');

// State
let allModels = [];
let currentModel = '';
const providerOrder = ['Anthropic', 'OpenAI', 'Qwen', 'Meta (Llama)', 'Mistral', 'Dolphin']; // Add more as needed

// Fetch current model
async function loadCurrentModel() {
    if (!currentModelDisplay) return;
    currentModelDisplay.textContent = 'Loading...';
    try {
        const response = await fetch(`${API_BASE_URL}/chat/model`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        currentModel = data.currentModel || 'Not Set'; // <-- FIX: Changed key from data.model
        currentModelDisplay.textContent = currentModel;
        // Re-evaluate save button state after loading current model
        updateSaveButtonState(); 
    } catch (error) {
        console.error('Error loading current model:', error);
        currentModelDisplay.textContent = 'Error loading model';
        currentModel = ''; // Reset current model on error
    }
}

// Fetch all available models
async function loadAllModels() {
    if (!modelSelect) return;
    modelSelect.innerHTML = '<option value="">Loading models...</option>';
    try {
        const response = await fetch(`${API_BASE_URL}/chat/debug/models`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allModels = await response.json();
        // Sort models alphabetically by ID within their provider group later
        allModels.sort((a, b) => a.id.localeCompare(b.id)); 
        populateModelSelect(); // Initial population
    } catch (error) {
        console.error('Error loading all models:', error);
        modelSelect.innerHTML = '<option value="">Error loading models</option>';
        allModels = []; // Clear models on error
    }
}

// Populate the model select dropdown
function populateModelSelect() {
    if (!modelSelect) return;

    const searchTerm = modelSearchInput.value.toLowerCase();
    modelSelect.innerHTML = ''; // Clear existing options

    // Add a default placeholder option
    const placeholderOption = document.createElement('option');
    placeholderOption.value = "";
    placeholderOption.textContent = "-- Select a Model --";
    placeholderOption.disabled = true; // Disable it initially
    placeholderOption.selected = true; // Make it selected by default
    modelSelect.appendChild(placeholderOption);


    const groupedModels = {};

    // Group models by provider prefix
    allModels.forEach(model => {
        let provider = 'Other'; // Default provider
        const modelIdLower = model.id.toLowerCase();

        if (modelIdLower.startsWith('anthropic/')) provider = 'Anthropic';
        else if (modelIdLower.startsWith('openai/')) provider = 'OpenAI';
        else if (modelIdLower.startsWith('google/')) provider = 'Google'; // Added Google as it's common
        else if (modelIdLower.startsWith('qwen/')) provider = 'Qwen';
        else if (modelIdLower.startsWith('meta-llama/')) provider = 'Meta (Llama)';
        else if (modelIdLower.startsWith('mistralai/')) provider = 'Mistral';
        else if (modelIdLower.startsWith('cognitivecomputations/')) provider = 'Dolphin';
        // Add more else if conditions for other known providers based on ID prefixes

        // Check if the model matches the search term (either ID or provider name)
        const providerLower = provider.toLowerCase();
        if (modelIdLower.includes(searchTerm) || providerLower.includes(searchTerm)) {
             if (!groupedModels[provider]) {
                groupedModels[provider] = [];
            }
            groupedModels[provider].push(model);
        }
    });

    // Function to add options for a provider group
    const addProviderGroup = (providerName) => {
        if (groupedModels[providerName] && groupedModels[providerName].length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = providerName;
            
            // Sort models within the group alphabetically by ID
            groupedModels[providerName].sort((a, b) => a.id.localeCompare(b.id));

            groupedModels[providerName].forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name ? `${model.name} (${model.id})` : model.id; // Display name if available
                // Pre-select the current model if it matches
                if (model.id === currentModel) {
                    option.selected = true;
                    placeholderOption.disabled = false; // Enable placeholder if current model is selected
                    placeholderOption.selected = false;
                }
                optgroup.appendChild(option);
            });
            modelSelect.appendChild(optgroup);
        }
    };

    // Add groups in the desired order
    providerOrder.forEach(provider => addProviderGroup(provider));

    // Add any remaining providers (like 'Other' or newly discovered ones)
    Object.keys(groupedModels)
        .filter(provider => !providerOrder.includes(provider))
        .sort() // Sort remaining providers alphabetically
        .forEach(provider => addProviderGroup(provider));
        
    // Re-evaluate save button state after populating
    updateSaveButtonState(); 
}


// Update save button enabled/disabled state
function updateSaveButtonState() {
     if (!saveModelBtn || !modelSelect) return;
     const selectedValue = modelSelect.value;
     // Enable if a model is selected AND it's different from the current model
     saveModelBtn.disabled = !selectedValue || selectedValue === currentModel;
}


// Save the selected model
async function saveSelectedModel() {
    if (!modelSelect || !saveModelBtn || !modelSaveStatus) return;

    const selectedModel = modelSelect.value;
    if (!selectedModel || selectedModel === currentModel) {
        modelSaveStatus.textContent = 'No changes to save.';
        modelSaveStatus.style.color = 'orange';
        return;
    }

    saveModelBtn.disabled = true;
    modelSaveStatus.textContent = 'Saving global default model...'; // Update status message
    modelSaveStatus.style.color = 'blue';

    try {
        const response = await fetch(`${API_BASE_URL}/chat/default-model`, { // Point to the new endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ model: selectedModel }),
        });

        if (!response.ok) {
             const errorData = await response.text(); // Get error details if possible
             throw new Error(`HTTP error! status: ${response.status} - ${errorData}`);
        }

        // Success
        modelSaveStatus.textContent = 'Global default model saved successfully!'; // Update status message
        modelSaveStatus.style.color = 'green';
        await loadCurrentModel(); // Refresh the current model display
        // The save button will be disabled by updateSaveButtonState called within loadCurrentModel

    } catch (error) {
        console.error('Error saving global default model:', error); // Update console log
        modelSaveStatus.textContent = `Error saving global default model: ${error.message}`; // Update status message
        modelSaveStatus.style.color = 'red';
        saveModelBtn.disabled = false; // Re-enable button on error to allow retry
    } finally {
         // Clear status message after a few seconds
         setTimeout(() => {
            modelSaveStatus.textContent = '';
         }, 5000);
    }
}


// Add Event Listeners for Model Selection
if (modelSearchInput) {
    modelSearchInput.addEventListener('input', populateModelSelect);
}

if (modelSelect) {
    // Update button state when selection changes
    modelSelect.addEventListener('change', updateSaveButtonState);
}

if (saveModelBtn) {
    saveModelBtn.addEventListener('click', saveSelectedModel);
}


// Modify showAdminPanel to load model data
const originalShowAdminPanel = showAdminPanel; // Store original function if needed
showAdminPanel = function() { // Override the function
    // Call the original logic first (if it exists and you need it)
    // originalShowAdminPanel(); // Uncomment if you need the original behavior too

    // Original logic from the provided script:
     if (loginContainer && adminContainer) {
        loginContainer.style.display = 'none';
        adminContainer.style.display = 'block';
        
        // Load instructions (original behavior)
        loadSystemInstructions();
        loadVisibleInstructions();
        
        // --- ADDED: Load model data ---
        loadCurrentModel();
        loadAllModels();
        // --- END ADDED ---
    }
    // Add any other logic from the original showAdminPanel if necessary
}

// Initial check in case the admin panel is already shown (e.g., cached auth)
if (adminContainer && adminContainer.style.display !== 'none') {
    loadCurrentModel();
    loadAllModels();
}