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
        // Try to access a protected endpoint to check if we're authenticated
        const response = await fetch(`${API_BASE_URL}/instructions/add-hidden`, {
            method: 'HEAD',
            credentials: 'include' // Important: include credentials for auth
        });
        
        if (response.ok || response.status === 405) { // 405 Method Not Allowed means we're authenticated but HEAD is not supported
            // If we can access the protected endpoint, we're authenticated
            showAdminPanel();
        } else if (response.status === 401 || response.status === 403) {
            // If we get 401 Unauthorized or 403 Forbidden, we're not authenticated
            // The login container is already visible by default, so we don't need to do anything
            console.log('Not authenticated. Please log in.');
        } else {
            console.error('Unexpected response when checking authentication:', response.status);
        }
    } catch (error) {
        console.error('Error checking authentication status:', error);
    }
}

function triggerAuthentication() {
    // This will trigger the browser's HTTP Basic Auth dialog
    fetch(`${API_BASE_URL}/instructions/add-hidden`, {
        method: 'HEAD',
        credentials: 'include',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    }).then(response => {
        if (response.ok || response.status === 405) {
            showAdminPanel();
        }
    });
}

function showAdminPanel() {
    if (loginContainer && adminContainer) {
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