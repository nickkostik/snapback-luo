const instructionInput = document.getElementById('trainingInstruction');
const confirmationMessageDiv = document.getElementById('confirmationMessage');
const savedInstructionsList = document.getElementById('savedInstructionsList'); // Get the list element
const memoryInput = document.getElementById('memoryInput');
const addMemoryBtn = document.getElementById('addMemoryBtn');
const memoryFeedback = document.getElementById('memoryFeedback');
const memoryList = document.getElementById('memoryList');

const API_BASE_URL = '/api'; // Backend API URL (now same origin) // Backend API URL (default Spring Boot port)
let confirmationTimeout;
let memoryFeedbackTimeout;

// --- API Helper Functions ---

// Fetch all memory facts from the backend
async function fetchMemoryFacts() {
    try {
        const response = await fetch(`${API_BASE_URL}/memory`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching memory facts:", error);
        return []; // Return empty array on error
    }
}

// Add a new memory fact to the backend
async function addMemoryFact(factText) {
    try {
        const response = await fetch(`${API_BASE_URL}/memory`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ factText: factText }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json(); // Return the saved memory fact with ID
    } catch (error) {
        console.error("Error adding memory fact:", error);
        showMemoryFeedback("❌ Error saving memory.", "#ff3b30");
        return null;
    }
}

// Update an existing memory fact
async function updateMemoryFact(id, factText) {
    try {
        const response = await fetch(`${API_BASE_URL}/memory/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: id, factText: factText }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error updating memory fact ${id}:`, error);
        showMemoryFeedback("❌ Error updating memory.", "#ff3b30");
        return null;
    }
}

// Delete a memory fact from the backend
async function deleteMemoryFact(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/memory/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return true; // Indicate success
    } catch (error) {
        console.error(`Error deleting memory fact ${id}:`, error);
        showMemoryFeedback("❌ Error deleting memory.", "#ff3b30");
        return false;
    }
}

async function fetchInstructions() {
    try {
        // This now fetches only the visible (non-hidden) instructions
        const response = await fetch(`${API_BASE_URL}/instructions`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching custom instructions:", error);
        savedInstructionsList.innerHTML = '<li>Error loading custom instructions. Is the backend running?</li>';
        return []; // Return empty array on error
    }
}

async function addInstructionToBackend(instructionText) {
    try {
        const response = await fetch(`${API_BASE_URL}/instructions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ instructionText: instructionText }), // Send as object
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json(); // Return the saved instruction with ID
    } catch (error) {
        console.error("Error adding instruction:", error);
        // Optionally show an error message to the user
        confirmationMessageDiv.textContent = `❌ Error saving custom instruction.`;
        confirmationMessageDiv.style.color = '#ff3b30'; // Use red for error
        confirmationMessageDiv.style.opacity = '1';
        clearTimeout(confirmationTimeout);
        confirmationTimeout = setTimeout(() => {
            confirmationMessageDiv.style.opacity = '0';
            confirmationMessageDiv.style.color = '#34c759'; // Reset color
        }, 4000);
        return null;
    }
}

async function deleteInstructionFromBackend(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/instructions/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            // Handle cases like 404 Not Found if needed, though UI should prevent this
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return true; // Indicate success
    } catch (error) {
        console.error(`Error deleting instruction ${id}:`, error);
        // Optionally show an error message
        alert(`Error deleting instruction ${id}.`);
        return false;
    }
}


// --- UI Update Functions ---

// Show feedback message in the memory log
function showMemoryFeedback(message, color = "#34c759") {
    if (memoryFeedback) {
        memoryFeedback.textContent = message;
        memoryFeedback.style.color = color;
        memoryFeedback.classList.add('show');
        
        // Clear previous timeout
        clearTimeout(memoryFeedbackTimeout);
        
        // Hide the feedback after a few seconds
        memoryFeedbackTimeout = setTimeout(() => {
            memoryFeedback.classList.remove('show');
        }, 3000);
    }
}

// Update the memory list display
async function updateMemoryList() {
    if (!memoryList) return;
    
    const memories = await fetchMemoryFacts();
    
    // Clear the current list
    memoryList.innerHTML = '';
    
    if (memories.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.classList.add('memory-empty-state');
        emptyItem.textContent = '(No memories logged yet)';
        memoryList.appendChild(emptyItem);
        return;
    }
    
    // Add each memory to the list
    memories.forEach(memory => {
        const item = document.createElement('li');
        
        // Create memory content span
        const contentSpan = document.createElement('span');
        contentSpan.classList.add('memory-content');
        contentSpan.textContent = memory.factText;
        item.appendChild(contentSpan);
        
        // Create actions container
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('memory-actions');
        
        // Create edit button
        const editBtn = document.createElement('button');
        editBtn.classList.add('edit-btn');
        editBtn.textContent = '✏️';
        editBtn.title = 'Edit memory';
        editBtn.addEventListener('click', () => editMemory(memory.id, memory.factText));
        actionsDiv.appendChild(editBtn);
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-btn');
        deleteBtn.textContent = '🗑';
        deleteBtn.title = 'Delete memory';
        deleteBtn.addEventListener('click', () => deleteMemory(memory.id));
        actionsDiv.appendChild(deleteBtn);
        
        item.appendChild(actionsDiv);
        memoryList.appendChild(item);
    });
}

// Function to handle adding a new memory
async function addMemory() {
    const factText = memoryInput.value.trim();
    
    if (factText) {
        memoryInput.disabled = true; // Disable input while saving
        showMemoryFeedback("Saving...", "#8e8e93");
        
        const savedMemory = await addMemoryFact(factText);
        
        memoryInput.disabled = false; // Re-enable input
        
        if (savedMemory) {
            // Clear the input field
            memoryInput.value = '';
            
            // Show success feedback
            showMemoryFeedback("✅ Memory saved!");
            
            // Update the memory list
            updateMemoryList();
        }
        
        memoryInput.focus();
    }
}

// Function to handle editing a memory
function editMemory(id, currentText) {
    // Create an input field to replace the text
    const item = Array.from(memoryList.children).find(li => {
        const contentSpan = li.querySelector('.memory-content');
        return contentSpan && contentSpan.textContent === currentText;
    });
    
    if (!item) return;
    
    const contentSpan = item.querySelector('.memory-content');
    const actionsDiv = item.querySelector('.memory-actions');
    
    // Hide the current content and actions
    contentSpan.style.display = 'none';
    actionsDiv.style.display = 'none';
    
    // Create edit input
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.value = currentText;
    editInput.style.flex = '1';
    editInput.style.marginRight = '8px';
    
    // Create save button
    const saveBtn = document.createElement('button');
    saveBtn.classList.add('button-style');
    saveBtn.textContent = 'Save';
    saveBtn.style.padding = '4px 8px';
    saveBtn.style.fontSize = '0.85rem';
    
    // Create cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.classList.add('button-style', 'secondary');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.padding = '4px 8px';
    cancelBtn.style.fontSize = '0.85rem';
    cancelBtn.style.marginLeft = '4px';
    
    // Create container for the edit form
    const editForm = document.createElement('div');
    editForm.style.display = 'flex';
    editForm.style.width = '100%';
    editForm.style.alignItems = 'center';
    
    editForm.appendChild(editInput);
    editForm.appendChild(saveBtn);
    editForm.appendChild(cancelBtn);
    
    item.insertBefore(editForm, contentSpan);
    
    // Focus the input
    editInput.focus();
    editInput.select();
    
    // Save function
    const saveEdit = async () => {
        const newText = editInput.value.trim();
        if (newText && newText !== currentText) {
            const updated = await updateMemoryFact(id, newText);
            if (updated) {
                contentSpan.textContent = newText;
                showMemoryFeedback("✅ Memory updated!");
            }
        }
        
        // Restore the original elements
        contentSpan.style.display = '';
        actionsDiv.style.display = '';
        editForm.remove();
    };
    
    // Cancel function
    const cancelEdit = () => {
        contentSpan.style.display = '';
        actionsDiv.style.display = '';
        editForm.remove();
    };
    
    // Add event listeners
    saveBtn.addEventListener('click', saveEdit);
    cancelBtn.addEventListener('click', cancelEdit);
    
    editInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            saveEdit();
        } else if (event.key === 'Escape') {
            cancelEdit();
        }
    });
}

// Function to handle deleting a memory
async function deleteMemory(id) {
    if (confirm('Are you sure you want to delete this memory fact?')) {
        const success = await deleteMemoryFact(id);
        if (success) {
            showMemoryFeedback("Memory deleted.");
            updateMemoryList();
        }
    }
}

// Function to update the display of saved instructions from the backend
async function updateSavedInstructionsDisplay() {
    if (!savedInstructionsList) return;

    savedInstructionsList.innerHTML = '<li>Loading custom instructions...</li>'; // Show loading state
    const instructions = await fetchInstructions();

    savedInstructionsList.innerHTML = ''; // Clear loading/previous list

    if (instructions.length === 0 && !savedInstructionsList.textContent.includes('Error')) {
         // Avoid overwriting error message if fetch failed
        savedInstructionsList.innerHTML = '<li>No custom instructions saved yet.</li>';
        return;
    }

    instructions.forEach(instr => {
        const item = document.createElement('li');
        // Display instruction text, handle potential null/undefined safely
        item.textContent = instr.instructionText || '(empty instruction)';

        // Add a delete button for each instruction
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '❌'; // Simple delete icon
        deleteButton.classList.add('delete-instruction-btn');
        deleteButton.title = 'Delete this instruction';
        // Call deleteInstruction with the instruction's ID from the backend
        deleteButton.onclick = () => deleteInstruction(instr.id);

        item.appendChild(deleteButton);
        savedInstructionsList.appendChild(item);
    });
}

// Function to handle deleting an instruction (called by button click)
async function deleteInstruction(idToDelete) {
    if (confirm('Are you sure you want to delete this custom instruction?')) {
        const success = await deleteInstructionFromBackend(idToDelete);
        if (success) {
            updateSavedInstructionsDisplay(); // Refresh the list from backend
        }
    }
}

// --- Event Listeners ---

// Memory input event listener
if (memoryInput) {
    memoryInput.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addMemory();
        }
    });
}

// Add memory button event listener
if (addMemoryBtn) {
    addMemoryBtn.addEventListener('click', addMemory);
}

instructionInput.addEventListener('keypress', async (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent default form submission

        const instructionText = instructionInput.value.trim();

        if (instructionText) {
            instructionInput.disabled = true; // Disable input while saving
            confirmationMessageDiv.textContent = `Saving...`;
            confirmationMessageDiv.style.color = '#8e8e93'; // Use gray for saving state
            confirmationMessageDiv.style.opacity = '1';

            const savedInstruction = await addInstructionToBackend(instructionText);

            instructionInput.disabled = false; // Re-enable input

            if (savedInstruction) {
                // Clear the input field ONLY on successful save
                instructionInput.value = '';

                // Show confirmation message
                confirmationMessageDiv.textContent = `✅ Custom instruction saved!`;
                confirmationMessageDiv.style.color = '#34c759'; // Green for success
                confirmationMessageDiv.style.opacity = '1';

                // Clear previous timeout
                clearTimeout(confirmationTimeout);

                // Hide the confirmation message after a few seconds
                confirmationTimeout = setTimeout(() => {
                    confirmationMessageDiv.style.opacity = '0';
                }, 3000);

                // Update the display of saved instructions
                updateSavedInstructionsDisplay();
            } else {
                 // Error handled in addInstructionToBackend, message already shown
                 instructionInput.focus(); // Keep focus on input on error
            }
        }
    }
});

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    // Ensure the DOM is fully loaded before manipulating it
    if (confirmationMessageDiv) {
        confirmationMessageDiv.style.opacity = '0';
        confirmationMessageDiv.style.transition = 'opacity 0.5s ease-out';
    }
    
    // Initialize memory feedback
    if (memoryFeedback) {
        memoryFeedback.style.opacity = '0';
        memoryFeedback.style.transition = 'opacity 0.5s ease-out';
    }
    
    updateSavedInstructionsDisplay(); // Load and display instructions from backend
    updateMemoryList(); // Load and display memory facts
});
// --- Categorize Instruction Panel Logic ---

const tabsContainer = document.querySelector('.behavior-categories-panel .tabs');
const tagArea = document.querySelector('.behavior-categories-panel .tags-area');
const newTagInput = document.getElementById('newTagInput');

// Add listeners to existing tab buttons
if (tabsContainer) {
    tabsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('tab-button')) {
            // Remove active class from all tabs
            tabsContainer.querySelectorAll('.tab-button').forEach(tab => tab.classList.remove('active'));
            // Add active class to the clicked tab
            event.target.classList.add('active');
            // TODO: Add logic here to potentially filter/load tags based on the selected category (data-category attribute)
            console.log(`Switched to category: ${event.target.dataset.category}`);
        }
    });
}

// Add listeners to existing tags and their remove buttons
function addTagEventListeners(tagElement) {
    const removeBtn = tagElement.querySelector('.remove-tag-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent tag click listener
            tagElement.remove();
            // TODO: Add logic to update the actual list of selected tags
            console.log(`Removed tag: ${tagElement.dataset.tagValue}`);
        });
    }
    // Add listener for selecting/deselecting the tag itself (visual only for now)
    tagElement.addEventListener('click', () => {
        tagElement.classList.toggle('selected'); // Add/remove 'selected' class
         // TODO: Add logic to update the actual list of selected tags
        console.log(`Toggled tag: ${tagElement.dataset.tagValue}`);
    });
}

if (tagArea) {
    // Add listeners to initially loaded tags
    tagArea.querySelectorAll('.tag').forEach(addTagEventListeners);

    // Listener for adding new tags
    if (newTagInput) {
        newTagInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && newTagInput.value.trim()) {
                event.preventDefault();
                const newTagName = newTagInput.value.trim();
                newTagInput.value = '';

                // Check if tag already exists (case-insensitive)
                const existingTag = Array.from(tagArea.querySelectorAll('.tag')).find(tag => tag.dataset.tagValue.toLowerCase() === newTagName.toLowerCase());
                if (existingTag) {
                    // Highlight existing tag briefly?
                    console.log(`Tag "${newTagName}" already exists.`);
                    return;
                }

                // Create new tag element
                const newTag = document.createElement('span');
                newTag.classList.add('tag');
                newTag.dataset.tagValue = newTagName; // Store value in data attribute
                newTag.textContent = newTagName + ' '; // Add space before button

                const removeButton = document.createElement('button');
                removeButton.classList.add('remove-tag-btn');
                removeButton.textContent = 'x';

                newTag.appendChild(removeButton);
                tagArea.insertBefore(newTag, newTagInput); // Insert before the input field
                addTagEventListeners(newTag); // Add listeners to the new tag

                console.log(`Added new tag: ${newTagName}`);
                 // TODO: Add logic to actually select the newly added tag if desired
            }
        });
    }
}

// --- Placeholder Listeners for Other Buttons ---

const startWizardBtn = document.getElementById('startWizardBtn');
const analyzeVoiceBtn = document.getElementById('analyzeVoiceBtn');
const previewTTSBtn = document.getElementById('previewTTSBtn');
const extractPersonalityBtn = document.getElementById('extractPersonalityBtn');
const addKnowledgeCardBtn = document.getElementById('addKnowledgeCardBtn');
const exportKnowledgeBtn = document.getElementById('exportKnowledgeBtn');
const exportFinetuneBtn = document.getElementById('exportFinetuneBtn');

if (startWizardBtn) {
    startWizardBtn.addEventListener('click', () => {
        alert('Form Wizard functionality not yet implemented.');
    });
}
if (analyzeVoiceBtn) {
    analyzeVoiceBtn.addEventListener('click', () => {
        alert('Voice Analysis functionality not yet implemented.');
    });
}
if (previewTTSBtn) {
    previewTTSBtn.addEventListener('click', () => {
        alert('TTS Preview functionality not yet implemented.');
    });
}
if (extractPersonalityBtn) {
    extractPersonalityBtn.addEventListener('click', () => {
        alert('Personality Extraction functionality not yet implemented.');
    });
}
if (addKnowledgeCardBtn) {
    addKnowledgeCardBtn.addEventListener('click', () => {
        alert('Add Knowledge Card functionality not yet implemented.');
    });
}
if (exportKnowledgeBtn) {
    exportKnowledgeBtn.addEventListener('click', () => {
        alert('Export Knowledge Base functionality not yet implemented.');
    });
}
if (exportFinetuneBtn) {
     exportFinetuneBtn.addEventListener('click', () => {
        alert('Export for Fine-tuning functionality not yet implemented.');
        // TODO: Implement JSONL export logic here later
        // 1. Fetch all instructions (already have fetchInstructions)
        // 2. Format them into JSONL: {"prompt": "User: ...", "completion": "Luis: ..."}
        //    (Requires parsing instructionText to separate user/luis parts, or a different input format)
        // 3. Trigger download of the generated file.
    });
}

// Add CSS for selected tag state
const styleSheet = document.createElement("style");
styleSheet.innerText = `.tag.selected { background-color: #007aff; color: white; } .tag.selected .remove-tag-btn { color: #e0e0e0; }`;
document.head.appendChild(styleSheet);
