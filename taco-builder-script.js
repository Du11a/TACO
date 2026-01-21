document.addEventListener('DOMContentLoaded', () => {
    // ===================================================================================
    // DATABASE SETUP (Dexie.js)
    // ===================================================================================
    const db = new Dexie('TacoBuilderDatabase');
    db.version(2).stores({
        blueprints: '++id, formName', // Primary key 'id', index 'formName'
        caseLogs: '++id, blueprintId, timestamp' // Add blueprintId to scope logs to a form
    });

    // ===================================================================================
    // STATE MANAGEMENT
    // The single source of truth for the form being built.
    // ===================================================================================
    let formBlueprint = {
        id: null, // For tracking in the database
        formName: 'New TACO Form',
        formSubtitle: 'A custom-built template for call outputs.',
        fields: []
    };

    // ===================================================================================
    // DOM ELEMENT REFERENCES
    // ===================================================================================
    const formNameInput = document.getElementById('formName');
    const formSubtitleInput = document.getElementById('formSubtitle');
    const fieldListContainer = document.getElementById('field-list');
    const addTextFieldBtn = document.getElementById('addTextField');
    const addTextareaBtn = document.getElementById('addTextarea');
    const addDropdownBtn = document.getElementById('addDropdown');
    const addStaticTextBtn = document.getElementById('addStaticText');
    const addCheckboxBtn = document.getElementById('addCheckbox');
    const saveFormBtn = document.getElementById('save-form-btn');
    const duplicateFormBtn = document.getElementById('duplicate-form-btn');
    const exportHtmlBtn = document.getElementById('export-html-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const importFormBtn = document.getElementById('import-form-btn');
    const importFileInput = document.getElementById('import-file-input');
    const formSelector = document.getElementById('form-selector');
    const toggleControlsBtn = document.getElementById('toggle-controls-btn');
    const builderContainer = document.querySelector('.builder-container');

    // Modal Elements
    const editModalOverlay = document.getElementById('edit-modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalFieldLabelInput = document.getElementById('modal-field-label');
    const modalNewOptionInput = document.getElementById('modal-new-option');
    const modalAddOptionBtn = document.getElementById('modal-add-option-btn');
    const modalBulkOptions = document.getElementById('modal-bulk-options');
    const modalAddBulkBtn = document.getElementById('modal-add-bulk-btn');
    const modalClearOptionsBtn = document.getElementById('modal-clear-options-btn');
    const modalOptionsList = document.getElementById('modal-options-list');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalSaveBtn = document.getElementById('modal-save-btn');
    const modalPlaceholderGroup = document.getElementById('modal-placeholder-group');
    const modalPlaceholderInput = document.getElementById('modal-field-placeholder');
    const modalFieldRequired = document.getElementById('modal-field-required');
    const modalOptionsSection = document.getElementById('modal-options-section');
    const modalHoverInfoGroup = document.getElementById('modal-hover-info-group');
    const modalHoverInfoTextarea = document.getElementById('modal-field-hover-info');
    const modalFieldIsMultiSelect = document.getElementById('modal-field-is-multiselect');
    const modalApplySection = document.getElementById('modal-apply-section');

    // Preview Elements
    const previewFormName = document.getElementById('preview-form-name');
    const previewSubtitle = document.getElementById('preview-subtitle');
    const previewFormContainer = document.getElementById('preview-form-container');
    const previewOutput = document.getElementById('preview-output');
    const previewPlaceholder = document.querySelector('.preview-placeholder');
    const previewCopyBtn = document.getElementById('preview-copy-btn');
    const previewClearBtn = document.getElementById('preview-clear-btn');
    const casesCountSpan = document.getElementById('cases-count');
    const logHistoryContainer = document.getElementById('log-history-container');
    const logSearchInput = document.getElementById('log-search');
    const downloadLogBtn = document.getElementById('download-log-btn');
    const notificationElement = document.getElementById('notification');

    // ===================================================================================
    // MODAL STATE
    // ===================================================================================
    let currentlyEditingField = null; // A temporary copy of the field being edited
    let currentlyEditingIndex = -1; // The original index in the formBlueprint.fields array



    // ===================================================================================
    // HELPER FUNCTIONS
    // ===================================================================================
    /**
     * Converts a string to camelCase. e.g., "Caller Name" -> "callerName"
     * @param {string} str The string to convert.
     * @returns {string} The camelCased string.
     */
    const toCamelCase = (str) => {
        if (!str) return '';
        return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        }).replace(/\s+/g, '');
    };

    /**
     * Parses a limited set of markdown-like syntax into HTML.
     * Supports: *bold*, _italic_, [link](url)
     * @param {string} text The text to parse.
     * @returns {string} The parsed HTML string.
     */
    function parseSimpleMarkdown(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    }
    // ===================================================================================
    // RENDERING LOGIC
    // The functions that draw the UI based on the current state.
    // ===================================================================================

    /**
     * Renders the list of fields in the left-hand control panel.
     */
    function renderFieldList() {
        fieldListContainer.innerHTML = ''; // Clear the list first
        if (formBlueprint.fields.length === 0) {
            fieldListContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No fields yet. Add one below!</p>';
            return;
        }

        formBlueprint.fields.forEach((field, index) => {
            const fieldItem = document.createElement('div');
            fieldItem.className = 'field-list-item';
            fieldItem.dataset.index = index; // Store index for event handling
            fieldItem.innerHTML = `
                <span class="drag-handle" title="Drag to reorder">⠿</span>
                <div class="field-info">
                    <span class="field-label">${field.label}</span>
                    <span class="field-type-tag">${field.type}</span>
                </div>
                <div class="field-actions">
                    <button class="icon-button" title="Edit" data-action="edit">✏️</button>
                    <button class="icon-button" title="Delete" data-action="delete">🗑️</button>
                </div>
            `;
            fieldListContainer.appendChild(fieldItem);
        });
    }

    /**
     * Renders the live form preview in the right-hand panel.
     */
    function renderFormPreview() {
        // Update titles
        previewFormName.textContent = formBlueprint.formName;
        previewSubtitle.textContent = formBlueprint.formSubtitle;

        // Update form fields
        if (formBlueprint.fields.length === 0) {
            previewPlaceholder.style.display = 'block';
            previewFormContainer.innerHTML = ''; // Clear any existing fields
            previewFormContainer.appendChild(previewPlaceholder);
            return;
        }

        previewPlaceholder.style.display = 'none';
        previewFormContainer.innerHTML = ''; // Clear the form

        // A map of field types to their rendering functions for a cleaner approach
        const fieldRenderers = {
            'static-text': createPreviewStaticText,
            'checkbox': createPreviewCheckboxGroup,
            'textarea': createPreviewTextarea,
            'searchable-dropdown': createPreviewSelect, // Default to text input
            'text': createPreviewInput
        };

        formBlueprint.fields.forEach(field => {
            const renderer = fieldRenderers[field.type] || fieldRenderers['text']; // Default to text input
            const fieldElement = renderer(field);
            previewFormContainer.appendChild(fieldElement);
        });
    }

    function createPreviewStaticText(field) {
        // Use a wrapper to handle layout with the optional info icon
        const wrapper = document.createElement('div');
        wrapper.className = 'label-wrapper';
        wrapper.style.alignItems = 'center';
        wrapper.style.marginBottom = '1.5rem'; // Mimic form-group spacing

        const staticElement = document.createElement('p');
        staticElement.className = 'static-text-element';
        staticElement.textContent = field.label;
        wrapper.appendChild(staticElement);

        if (field.hoverInfo) {
            const infoIcon = document.createElement('span');
            infoIcon.className = 'info-icon';
            infoIcon.textContent = 'i';
            
            const tooltip = document.createElement('span');
            tooltip.className = 'tooltip-text';
            tooltip.innerHTML = parseSimpleMarkdown(field.hoverInfo);
            
            infoIcon.appendChild(tooltip);
            wrapper.appendChild(infoIcon);
        }

        return wrapper;
    }

    function createPreviewCheckboxGroup(field) {
        const fieldset = document.createElement('fieldset');
        fieldset.className = 'form-group';

        const legend = document.createElement('legend');
        legend.textContent = field.label;
        if (field.required) {
            legend.textContent += ' *';
        }
        fieldset.appendChild(legend);

        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'checkbox-group';

        if (field.options && field.options.length > 0) {
            field.options.forEach(opt => {
                const itemWrapper = document.createElement('div');
                const checkboxId = `preview-${field.id}-${toCamelCase(opt.value)}`;
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = checkboxId;
                checkbox.name = field.id;
                checkbox.value = opt.value;
                const label = document.createElement('label');
                label.setAttribute('for', checkboxId);
                label.textContent = opt.value;
                itemWrapper.append(checkbox, label);
                checkboxContainer.appendChild(itemWrapper);
            });
        }
        fieldset.appendChild(checkboxContainer);
        return fieldset;
    }

    function createPreviewSelect(field) {
        const wrapper = createFieldWrapper(field);
    
        if (field.isMultiSelect) {
            // --- Render the new Tag Selector UI with a searchable input ---
            const inputGroup = document.createElement('div');
            inputGroup.className = 'tag-selector-input-group';
    
            // --- Create the searchable input component ---
            const container = document.createElement('div');
            container.className = 'searchable-select-container';
    
            const visibleInput = document.createElement('input');
            visibleInput.type = 'text';
            visibleInput.className = 'searchable-select-input';
            // This ID is important for the 'Add' button to find it.
            visibleInput.id = `search-input-for-${field.id}`; 
            visibleInput.placeholder = field.placeholder || 'Search to add...';
            visibleInput.autocomplete = 'off';
    
            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'searchable-select-options';
    
            if (field.options && field.options.length > 0) {
                field.options.forEach(opt => {
                    const optionEl = document.createElement('div');
                    optionEl.className = 'searchable-select-option';
                    optionEl.dataset.value = opt.value;
                    optionEl.textContent = opt.value;
                    optionsContainer.appendChild(optionEl);
                });
            }
    
            container.appendChild(visibleInput);
            container.appendChild(optionsContainer);
            // --- End of searchable input component ---
    
            const button = document.createElement('button');
            button.textContent = 'Add';
            button.className = 'secondary';
            button.type = 'button'; // Prevent form submission in other contexts
            button.dataset.action = 'add-tag';
            button.dataset.fieldId = field.id;
    
            inputGroup.appendChild(container);
            inputGroup.appendChild(button);
            wrapper.appendChild(inputGroup);
    
            // Wrapper for tag container and remove all button
            const tagAreaWrapper = document.createElement('div');
            tagAreaWrapper.className = 'tag-area-wrapper';

            const tagContainer = document.createElement('div');
            tagContainer.className = 'tag-container';
            tagContainer.id = `tags-for-${field.id}`;

            const removeAllBtn = document.createElement('button');
            removeAllBtn.type = 'button';
            removeAllBtn.className = 'remove-all-tags-btn';
            removeAllBtn.textContent = 'Clear All';
            removeAllBtn.title = 'Remove all selected options';
            removeAllBtn.dataset.action = 'remove-all-tags';
            removeAllBtn.dataset.fieldId = field.id;

            tagAreaWrapper.appendChild(tagContainer);
            tagAreaWrapper.appendChild(removeAllBtn);
            wrapper.appendChild(tagAreaWrapper);
    
            // This hidden input will hold the actual value for the output preview
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = `preview-${field.id}`; // This ID is what renderOutputPreview looks for
            hiddenInput.name = field.id;
            wrapper.appendChild(hiddenInput);
    
        } else {
            // --- Render a custom searchable dropdown ---
            const container = document.createElement('div');
            container.className = 'searchable-select-container';
    
            const visibleInput = document.createElement('input');
            visibleInput.type = 'text';
            visibleInput.className = 'searchable-select-input';
            visibleInput.placeholder = field.placeholder || 'Search and select...';
            visibleInput.autocomplete = 'off';
    
            // This hidden input holds the actual value for the output preview
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = `preview-${field.id}`; // This ID is what renderOutputPreview looks for
            hiddenInput.name = field.id;
    
            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'searchable-select-options';
    
            if (field.options && field.options.length > 0) {
                field.options.forEach(opt => {
                    const optionEl = document.createElement('div');
                    optionEl.className = 'searchable-select-option';
                    optionEl.dataset.value = opt.value;
                    optionEl.textContent = opt.value;
                    optionsContainer.appendChild(optionEl);
                });
            }
    
            container.appendChild(visibleInput);
            container.appendChild(hiddenInput);
            container.appendChild(optionsContainer);
            wrapper.appendChild(container);
        }
    
        return wrapper;
    }

    /** Helper to create just the <select> element, used in createPreviewSelect */
    function createSelectElement(field) {
        const select = document.createElement('select');
        select.id = `preview-${field.id}`;
        select.name = field.id;

        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = field.placeholder || `Select an option...`;
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        select.appendChild(placeholderOption);

        if (field.options && field.options.length > 0) {
            // Render a flat list of options
            field.options.forEach(opt => {
                const optionEl = document.createElement('option');
                optionEl.value = opt.value;
                optionEl.textContent = opt.value;
                select.appendChild(optionEl);
            });
        }
        return select;
    }

    function createPreviewTextarea(field) {
        const wrapper = createFieldWrapper(field);
        const textarea = document.createElement('textarea');
        textarea.id = `preview-${field.id}`;
        textarea.name = field.id;
        textarea.rows = 3;
        textarea.placeholder = field.placeholder || '';
        wrapper.appendChild(textarea);
        return wrapper;
    }

    function createPreviewInput(field) {
        const wrapper = createFieldWrapper(field);
        const input = document.createElement('input');
        input.id = `preview-${field.id}`;
        input.name = field.id;
        input.type = 'text';
        input.placeholder = field.placeholder || '';
        wrapper.appendChild(input);
        return wrapper;
    }

    /**
     * Helper to create the common div and label for a form field.
     */
    function createFieldWrapper(field) {
        const fieldWrapper = document.createElement('div');
        fieldWrapper.className = 'form-group';

        const label = document.createElement('label');
        label.setAttribute('for', `preview-${field.id}`);
        label.textContent = field.label;

        if (field.required) {
            label.textContent += ' *';
        }

        fieldWrapper.appendChild(label);
        return fieldWrapper;
    }

    /**
     * Renders the final text output preview.
     */
    function renderOutputPreview() {
        // 1. Generate the template string from the current blueprint.
        // This ensures the live preview matches the exported form's logic.
        const outputTemplate = formBlueprint.fields
            .filter(field => field.type !== 'static-text')
            .map(field => `${field.label}: {{${field.id}}}`)
            .join('\n');

        let output = outputTemplate;

        // 2. Substitute values from the live preview form into the template.
        formBlueprint.fields.forEach(field => {
            if (field.type === 'static-text') return;

            let value = 'N/A'; // Default value

            if (field.type === 'checkbox') {
                // Use the name attribute to select all checkboxes in a group.
                const checkedCheckboxes = previewFormContainer.querySelectorAll(`input[name="${field.id}"]:checked`);
                const checkedValues = Array.from(checkedCheckboxes).map(cb => cb.value);
                value = checkedValues.length > 0 ? checkedValues.join(', ') : 'None';
            } else {
                // Use the name attribute for other fields as well for consistency.
                const inputElement = previewFormContainer.querySelector(`[name="${field.id}"]`);
                if (inputElement && inputElement.value.trim() !== '') {
                    value = inputElement.value;
                }
            }
            
            // Perform the substitution.
            // The 'g' flag is important to replace all occurrences if the same ID is used multiple times.
            output = output.replace(new RegExp(`{{${field.id}}}`, 'g'), value);
        });

        previewOutput.textContent = output;
    }

    /**
     * The main render function. Calls all other render functions to update the UI.
     */
    function render() {
        // console.log('State changed, re-rendering...', formBlueprint);
        renderFieldList();
        renderFormPreview();
        renderOutputPreview();
    }

    // ===================================================================================
    // EVENT LISTENERS
    // ===================================================================================

    // Update form name in state and re-render
    formNameInput.addEventListener('input', (e) => {
        formBlueprint.formName = e.target.value;
        // Don't do a full re-render, which would wipe form inputs. Just update the preview title.
        previewFormName.textContent = formBlueprint.formName;
    });

    // Update form subtitle in state and re-render
    formSubtitleInput.addEventListener('input', (e) => {
        formBlueprint.formSubtitle = e.target.value;
        // Don't do a full re-render. Just update the preview subtitle.
        previewSubtitle.textContent = formBlueprint.formSubtitle;
    });

    // Generic function to add a new field
    function addNewField(type) {
        // Unify the creation process: all new fields open the modal.
        const newField = {
            label: '', // User will provide this in the modal
            id: '',
            type: type,
            required: true, // Default to required, user can uncheck
            placeholder: ''
        };

        if (type === 'searchable-dropdown' || type === 'checkbox') {
            newField.options = [];
        }
        if (type === 'static-text') {
            newField.required = false; // Static text can't be required
        }

        openEditModal(newField, -1);
    }

    addTextFieldBtn.addEventListener('click', () => addNewField('text'));
    addTextareaBtn.addEventListener('click', () => addNewField('textarea'));
    addDropdownBtn.addEventListener('click', () => addNewField('searchable-dropdown'));
    addStaticTextBtn.addEventListener('click', () => addNewField('static-text'));
    addCheckboxBtn.addEventListener('click', () => addNewField('checkbox'));
    saveFormBtn.addEventListener('click', saveCurrentBlueprint);
    duplicateFormBtn.addEventListener('click', handleDuplicateBlueprint);
    exportHtmlBtn.addEventListener('click', exportAsHtml);
    exportJsonBtn.addEventListener('click', exportAsJson);
    importFormBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', handleFileImport);

    toggleControlsBtn.addEventListener('click', () => {
        const isCollapsed = builderContainer.classList.toggle('controls-collapsed');
        toggleControlsBtn.textContent = isCollapsed ? '»' : '«';
        toggleControlsBtn.title = isCollapsed ? 'Expand Controls' : 'Collapse Controls';
        // Save state to localStorage
        localStorage.setItem('tacoBuilderControlsCollapsed', isCollapsed);
    });

    // Event listeners for the new preview panel controls
    previewCopyBtn.addEventListener('click', logCase);
    previewClearBtn.addEventListener('click', clearPreviewForm);
    downloadLogBtn.addEventListener('click', downloadLogHistory);
    logSearchInput.addEventListener('input', (e) => loadAndRenderLogs(e.target.value));
    logHistoryContainer.addEventListener('click', handleLogHistoryClick);
    
    // --- Event handling for custom searchable dropdowns in preview ---

    // Show/hide dropdown on focus and handle outside clicks to close
    document.addEventListener('click', (e) => {
        const activeDropdown = document.querySelector('.searchable-select-container.active');
        const clickedContainer = e.target.closest('.searchable-select-container');

        // If there's an active dropdown and the click is outside of it, close it.
        if (activeDropdown && activeDropdown !== clickedContainer) {
            activeDropdown.classList.remove('active');
        }
    });

    previewFormContainer.addEventListener('focusin', (e) => {
        const input = e.target.closest('.searchable-select-input');
        if (input) {
            const container = input.closest('.searchable-select-container');
            // Close any other open dropdowns
            const otherOpen = document.querySelector('.searchable-select-container.active');
            if (otherOpen && otherOpen !== container) {
                otherOpen.classList.remove('active');
            }
            // Open this one and filter options
            container.classList.add('active');

            const optionsContainer = container.querySelector('.searchable-select-options');
            const filterText = input.value.toLowerCase();
            const isMultiSelect = !!container.closest('.tag-selector-input-group');

            let selectedValues = [];
            if (isMultiSelect) {
                const formGroup = container.closest('.form-group');
                const hiddenInput = formGroup.querySelector('input[type="hidden"]');
                if (hiddenInput && hiddenInput.value) {
                    selectedValues = hiddenInput.value.split(',');
                }
            }

            const options = optionsContainer.querySelectorAll('.searchable-select-option');
            options.forEach(option => {
                const optionValue = option.textContent.toLowerCase();
                const isSelected = selectedValues.includes(option.dataset.value);
                option.style.display = (optionValue.includes(filterText) && !isSelected) ? '' : 'none';
            });
        }
    });

    // Handles filtering for custom dropdowns and updates the main output preview
    previewFormContainer.addEventListener('input', (e) => {
        const input = e.target.closest('.searchable-select-input');
        if (input) {
            const container = input.closest('.searchable-select-container');
            const optionsContainer = container.querySelector('.searchable-select-options');
            const filterText = input.value.toLowerCase();
            const isMultiSelect = !!container.closest('.tag-selector-input-group');

            if (!isMultiSelect) {
                // For single-select, clear the hidden value while typing
                const hiddenInput = container.querySelector('input[type="hidden"]');
                if (hiddenInput) {
                    hiddenInput.value = '';
                }
            }

            let selectedValues = [];
            if (isMultiSelect) {
                const formGroup = container.closest('.form-group');
                const hiddenInput = formGroup.querySelector('input[type="hidden"]');
                if (hiddenInput && hiddenInput.value) {
                    selectedValues = hiddenInput.value.split(',');
                }
            }
            
            const options = optionsContainer.querySelectorAll('.searchable-select-option');
            options.forEach(option => {
                const optionValue = option.textContent.toLowerCase();
                const isSelected = selectedValues.includes(option.dataset.value);
                option.style.display = (optionValue.includes(filterText) && !isSelected) ? '' : 'none';
            });
        }
        // Always update the main output preview on any input event
        renderOutputPreview();
    });

    // Add a new delegated CLICK listener for actions inside the preview form
    previewFormContainer.addEventListener('click', (e) => {
        const addTagButton = e.target.closest('button[data-action="add-tag"]');
        const removeTagButton = e.target.closest('button[data-action="remove-tag"]');
        const removeAllButton = e.target.closest('button[data-action="remove-all-tags"]');
        const customSelectOption = e.target.closest('.searchable-select-option');
    
        if (addTagButton) {
            const fieldId = addTagButton.dataset.fieldId;
            const searchInput = previewFormContainer.querySelector(`#search-input-for-${fieldId}`);
            const hiddenInput = previewFormContainer.querySelector(`#preview-${fieldId}`);
            const tagContainer = previewFormContainer.querySelector(`#tags-for-${fieldId}`);
            
            if (searchInput && hiddenInput && tagContainer && searchInput.value) {
                const valueToAdd = searchInput.value.trim();

                // Find the blueprint field to validate against its options
                const field = formBlueprint.fields.find(f => f.id === fieldId);
                const isValidOption = field && field.options.some(opt => opt.value === valueToAdd);

                if (!isValidOption) {
                    showNotification(`"${valueToAdd}" is not a valid option.`, true);
                    return;
                }

                const currentValues = hiddenInput.value ? hiddenInput.value.split(',') : [];
    
                if (!currentValues.includes(valueToAdd)) {
                    // Add to UI
                    const tag = document.createElement('span');
                    tag.className = 'tag';
                    tag.dataset.value = valueToAdd;
                    tag.innerHTML = `
                        ${valueToAdd}
                        <button type="button" data-action="remove-tag" data-field-id="${fieldId}">&times;</button>
                    `;
                    tagContainer.appendChild(tag);
    
                    // Add to hidden input
                    currentValues.push(valueToAdd);
                    hiddenInput.value = currentValues.join(',');
                    hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                searchInput.value = ''; // Reset the search input
                searchInput.focus(); // Focus for next entry
            }
        }
    
        if (removeTagButton) {
            const fieldId = removeTagButton.dataset.fieldId;
            const tagEl = removeTagButton.closest('.tag');
            const valueToRemove = tagEl.dataset.value;
            const hiddenInput = previewFormContainer.querySelector(`#preview-${fieldId}`);
            
            if (tagEl && hiddenInput) {
                // Remove from UI
                tagEl.remove();
    
                // Remove from hidden input
                let currentValues = hiddenInput.value ? hiddenInput.value.split(',') : [];
                currentValues = currentValues.filter(v => v !== valueToRemove);
                hiddenInput.value = currentValues.join(',');
                hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        if (removeAllButton) {
            const fieldId = removeAllButton.dataset.fieldId;
            const tagContainer = previewFormContainer.querySelector(`#tags-for-${fieldId}`);
            const hiddenInput = previewFormContainer.querySelector(`#preview-${fieldId}`);

            if (tagContainer && hiddenInput) {
                tagContainer.innerHTML = ''; // Clear UI
                hiddenInput.value = ''; // Clear data
                hiddenInput.dispatchEvent(new Event('input', { bubbles: true })); // Update output
            }
        }

        if (customSelectOption && customSelectOption.dataset.value) {
            const container = customSelectOption.closest('.searchable-select-container');
            if (!container) return;

            const visibleInput = container.querySelector('.searchable-select-input');
            const selectedValue = customSelectOption.dataset.value;
            
            visibleInput.value = selectedValue;
            container.classList.remove('active'); // Hide the dropdown

            const isMultiSelect = !!container.closest('.tag-selector-input-group');

            if (isMultiSelect) {
                // For multi-select, just populate the input and focus the add button for quick action.
                const inputGroup = container.closest('.tag-selector-input-group');
                const addButton = inputGroup.querySelector('button[data-action="add-tag"]');
                if (addButton) {
                    addButton.focus();
                }
            } else {
                // For single-select, update the hidden input and trigger preview render.
                const hiddenInput = container.querySelector('input[type="hidden"]');
                if (hiddenInput) {
                    hiddenInput.value = selectedValue;
                    // Manually trigger input event on the hidden input so renderOutputPreview() runs
                    hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        }
    });

    /**
     * Handles clicks on the field list for editing or deleting fields.
     */
    fieldListContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.icon-button[data-action]');
        if (!button) return; // Exit if the click wasn't on an action button

        const fieldItem = e.target.closest('.field-list-item');
        if (!fieldItem) return;

        const index = parseInt(fieldItem.dataset.index, 10);
        const action = button.dataset.action;

        if (action === 'delete') {
            handleDeleteField(index);
        } else if (action === 'edit') {
            handleEditField(index);
        }
    });

    function handleDeleteField(index) {
        const field = formBlueprint.fields[index];
        if (confirm(`Are you sure you want to delete the "${field.label}" field?`)) {
            formBlueprint.fields.splice(index, 1);
            render();
        }
    }

    function handleEditField(index) {
        const field = formBlueprint.fields[index];
        // All fields now use the modal for editing.
        openEditModal(field, index);
    }

    // ===================================================================================
    // MODAL LOGIC
    // ===================================================================================

    function openEditModal(field, index) {
        // Create a deep copy to avoid modifying the original state until we save
        currentlyEditingField = JSON.parse(JSON.stringify(field));
        currentlyEditingIndex = index;

        // Configure modal title
        let titleText;
        const fieldTypeName = field.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (index === -1) { // New field
            titleText = `Add New ${fieldTypeName}`;
        } else { // Existing field
            titleText = `Edit ${fieldTypeName}`;
        }
        modalTitle.textContent = titleText;

        // Show/hide sections based on field type
        const hasOptions = field.type === 'searchable-dropdown' || field.type === 'checkbox';
        const hasPlaceholder = field.type === 'text' || field.type === 'textarea';
        const isDropdown = field.type === 'searchable-dropdown';
        const isStaticText = field.type === 'static-text';
    
        modalOptionsSection.style.display = hasOptions ? 'block' : 'none';
        modalPlaceholderGroup.style.display = hasPlaceholder ? 'block' : 'none';
        modalApplySection.style.display = isDropdown ? 'block' : 'none';
        modalHoverInfoGroup.style.display = isStaticText ? 'block' : 'none';
    
        // Populate modal with the field's current data
        modalFieldLabelInput.value = currentlyEditingField.label;
        modalFieldRequired.checked = currentlyEditingField.required || false;
    
        if (isDropdown) {
            modalFieldIsMultiSelect.checked = currentlyEditingField.isMultiSelect || false;
        }
        if (isStaticText) {
            modalHoverInfoTextarea.value = currentlyEditingField.hoverInfo || '';
        }
        if (hasPlaceholder) {
            modalPlaceholderInput.value = currentlyEditingField.placeholder || '';
        }
        if (hasOptions) {
            renderModalOptionsList();
        }

        editModalOverlay.classList.add('visible');
        modalFieldLabelInput.focus();
    }

    function closeEditModal() {
        editModalOverlay.classList.remove('visible');
        currentlyEditingField = null;
        currentlyEditingIndex = -1;
        modalNewOptionInput.value = '';
        modalBulkOptions.value = '';
        modalHoverInfoTextarea.value = '';
    }

    function renderModalOptionsList() {
        modalOptionsList.innerHTML = '';
        if (!currentlyEditingField || !currentlyEditingField.options || currentlyEditingField.options.length === 0) {
            modalOptionsList.innerHTML = '<li style="color: var(--text-secondary); text-align: center;">No options added yet.</li>';
            return;
        }

        currentlyEditingField.options.forEach((option, index) => {
            const li = document.createElement('li');
            li.className = 'modal-option-item';
            li.innerHTML = `
                <span>${option.value}</span>
                <button class="icon-button" data-index="${index}" title="Delete Option">🗑️</button>
            `;
            modalOptionsList.appendChild(li);
        });
    }

    function handleAddOption() {
        const newOptionValue = modalNewOptionInput.value.trim();
        if (newOptionValue) {
            currentlyEditingField.options.push({ group: 'General', value: newOptionValue });
            modalNewOptionInput.value = '';
            renderModalOptionsList();
        }
        modalNewOptionInput.focus();
    }

    function handleAddBulkOptions() {
        const bulkText = modalBulkOptions.value.trim();
        if (!bulkText) {
            return; // Nothing to add
        }

        const newOptions = bulkText
            .split('\n') // Split by new line
            .map(line => line.trim()) // Trim whitespace from each line
            .filter(line => line.length > 0); // Remove any empty lines

        if (newOptions.length > 0) {
            const optionObjects = newOptions.map(opt => ({ group: 'General', value: opt }));
            currentlyEditingField.options.push(...optionObjects);
            modalBulkOptions.value = ''; // Clear the textarea
            renderModalOptionsList(); // Re-render the list
        }
        modalNewOptionInput.focus(); // Set focus back to the single input for convenience
    }

    modalAddOptionBtn.addEventListener('click', handleAddOption);
    modalNewOptionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddOption();
        }
    });

    modalAddBulkBtn.addEventListener('click', handleAddBulkOptions);

    function handleClearAllOptions() {
        if (currentlyEditingField && currentlyEditingField.options && currentlyEditingField.options.length > 0) {
            if (confirm('Are you sure you want to remove all options from this list? This cannot be undone.')) {
                currentlyEditingField.options = [];
                renderModalOptionsList();
            }
        }
    }

    modalClearOptionsBtn.addEventListener('click', handleClearAllOptions);

    modalOptionsList.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('button');
        if (deleteButton) {
            const index = parseInt(deleteButton.dataset.index, 10);
            currentlyEditingField.options.splice(index, 1);
            renderModalOptionsList();
        }
    });

    modalSaveBtn.addEventListener('click', () => {
        // Update label and ID from the modal input
        const newLabel = modalFieldLabelInput.value.trim();
        if (!newLabel) {
            alert('Field Label cannot be empty.');
            return;
        }

        // Update the temporary field object with all data from the modal
        currentlyEditingField.label = newLabel;
        currentlyEditingField.id = toCamelCase(newLabel);
        currentlyEditingField.required = modalFieldRequired.checked;

        if (currentlyEditingField.type === 'searchable-dropdown') {
            currentlyEditingField.isMultiSelect = modalFieldIsMultiSelect.checked;
        }

        if (currentlyEditingField.type === 'static-text') {
            const hoverInfo = modalHoverInfoTextarea.value.trim();
            if (hoverInfo) {
                currentlyEditingField.hoverInfo = hoverInfo;
            } else {
                delete currentlyEditingField.hoverInfo; // Keep blueprint clean
            }
        }

        const hasPlaceholder = currentlyEditingField.type === 'text' || currentlyEditingField.type === 'textarea';
        if (hasPlaceholder) {
            currentlyEditingField.placeholder = modalPlaceholderInput.value;
        } else if (currentlyEditingField.type === 'searchable-dropdown') {
            currentlyEditingField.placeholder = `Select ${newLabel}...`;
        }

        if (currentlyEditingIndex === -1) { // This was a new field
            // This is a new field, add it to the blueprint
            formBlueprint.fields.push(currentlyEditingField);
        } else {
            // This is an existing field, update it in the blueprint
            formBlueprint.fields[currentlyEditingIndex] = currentlyEditingField;
        }

        render();
        closeEditModal();
    });

    modalCloseBtn.addEventListener('click', closeEditModal);
    modalCancelBtn.addEventListener('click', closeEditModal);
    editModalOverlay.addEventListener('click', (e) => {
        if (e.target === editModalOverlay) { // Only close if clicking the background
            closeEditModal();
        }
    });

    // ===================================================================================
    // LOG HISTORY AND COUNTER LOGIC
    // ===================================================================================

    function showNotification(message, isError = false) {
        notificationElement.textContent = message;
        notificationElement.style.backgroundColor = isError ? 'var(--danger-color)' : 'var(--accent-color)';
        notificationElement.classList.add('show');
        setTimeout(() => {
            notificationElement.classList.remove('show');
        }, 3000);
    }

    function clearPreviewForm() {
        // Clear standard form inputs
        previewFormContainer.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.type === 'checkbox' || el.type === 'radio') {
                el.checked = false;
            } else {
                el.value = '';
            }
        });

        // Specifically clear the visual tags for multi-select dropdowns
        previewFormContainer.querySelectorAll('.tag-container').forEach(container => {
            container.innerHTML = '';
        });
        renderOutputPreview(); // Update the preview to show default values
    }

    async function logCase() {
        // A blueprint must be saved before its logs can be tracked.
        if (formBlueprint.id === null) {
            showNotification('Please save the blueprint before logging cases.', true);
            saveFormBtn.focus();
            return;
        }

        const outputText = previewOutput.textContent;
        if (!outputText || outputText === 'Your output template will be previewed here.') {
            showNotification('Output is empty, nothing to log.', true);
            return;
        }

        const logEntry = {
            blueprintId: formBlueprint.id,
            timestamp: new Date(),
            data: {},
            fullOutput: outputText
        };

        // Populate the data object with current form values
        formBlueprint.fields.forEach(field => {
            if (field.type === 'static-text') return;
            const element = previewFormContainer.querySelector(`[name="${field.id}"]`);
            if (field.type === 'checkbox') {
                const checked = Array.from(previewFormContainer.querySelectorAll(`input[name="${field.id}"]:checked`)).map(cb => cb.value);
                logEntry.data[field.id] = checked;
            } else if (element) {
                logEntry.data[field.id] = element.value;
            }
        });

        try {
            await db.caseLogs.add(logEntry);
            await navigator.clipboard.writeText(outputText);
            showNotification('Copied to clipboard and logged!');
            clearPreviewForm();
            await loadAndRenderLogs();
        } catch (error) {
            console.error('Failed to log case:', error);
            showNotification('Error logging case.', true);
        }
    }

    async function updateCasesCounter() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // If no blueprint is loaded (it's a new form), the count is 0.
        if (formBlueprint.id === null) {
            casesCountSpan.textContent = 0;
            return;
        }

        const count = await db.caseLogs
            .where({ blueprintId: formBlueprint.id })
            .and(log => log.timestamp >= today)
            .count();

        casesCountSpan.textContent = count;
    }

    async function loadAndRenderLogs(searchTerm = '') {
        // If no blueprint is selected (i.e., it's a new, unsaved form), show no logs.
        if (formBlueprint.id === null) {
            renderLogHistory([]);
            await updateCasesCounter();
            return;
        }

        let query = db.caseLogs.where({ blueprintId: formBlueprint.id });

        if (searchTerm) {
            // This is a simple text search. It's not perfect but works for most cases.
            const lowerSearchTerm = searchTerm.toLowerCase();
            query = query.and(log => log.fullOutput.toLowerCase().includes(lowerSearchTerm));
        }

        const logs = await query.reverse().sortBy('timestamp');
        renderLogHistory(logs);
        await updateCasesCounter();
    }

    function renderLogHistory(logs) {
        logHistoryContainer.innerHTML = '';
        if (logs.length === 0) {
            logHistoryContainer.innerHTML = '<p style="text-align:center; color: var(--text-secondary);">No logs yet.</p>';
            return;
        }

        // Helper function to find the best title for a log entry
        const getLogTitle = (log) => {
            // 1. Prioritize fields that look like a "Case Number" or "Case ID"
            const caseNumberField = formBlueprint.fields.find(f => {
                if (!f.label) return false;
                const label = f.label.toLowerCase();
                return label.includes('case') && (label.includes('number') || label.includes('id'));
            });

            if (caseNumberField && log.data[caseNumberField.id]) {
                return `Case: ${log.data[caseNumberField.id]}`;
            }

            // 2. Fallback to the first field in the form if it has a value
            const firstField = formBlueprint.fields[0];
            if (firstField && log.data[firstField.id]) {
                // Use the field's actual label for clarity
                return `${firstField.label}: ${log.data[firstField.id]}`;
            }

            // 3. Generic fallback
            return 'Log Entry';
        };

        logs.forEach(log => {
            const logEl = document.createElement('div');
            logEl.className = 'log-entry'; // Collapsed by default
            logEl.dataset.logId = log.id;

            const title = getLogTitle(log);

            logEl.innerHTML = `
                <div class="log-entry-header">
                    <div class="log-title-group">
                        <span class="log-toggle-icon"></span>
                        <span class="log-entry-title" title="${title}">${title}</span>
                    </div>
                    <div class="log-actions-group">
                        <span class="log-entry-timestamp">${new Date(log.timestamp).toLocaleString()}</span>
                        <button class="icon-button" title="Copy this log's output" data-action="copy-log">📋</button>
                        <button class="icon-button" title="Delete this log" data-action="delete-log">🗑️</button>
                    </div>
                </div>
                <pre class="log-entry-body">${log.fullOutput}</pre>
            `;
            logHistoryContainer.appendChild(logEl);
        });
    }

    function handleLogHistoryClick(e) {
        // Delegate click based on the target element
        const actionButton = e.target.closest('button[data-action]');
        const logHeader = e.target.closest('.log-entry-header');

        if (actionButton) {
            // An action button (copy, delete) was clicked
            const logEntryEl = actionButton.closest('.log-entry');
            if (!logEntryEl) return;

            const action = actionButton.dataset.action;
            const logId = parseInt(logEntryEl.dataset.logId, 10);

            if (action === 'copy-log') {
                const logEntryBody = logEntryEl.querySelector('.log-entry-body');
                if (logEntryBody) {
                    navigator.clipboard.writeText(logEntryBody.textContent);
                    showNotification('Copied log entry!');
                }
            } else if (action === 'delete-log') {
                if (!isNaN(logId)) {
                    handleDeleteLog(logId, logEntryEl);
                }
            }
        } else if (logHeader) {
            // The header area (but not a button) was clicked, toggle expand/collapse
            const logEntry = logHeader.closest('.log-entry');
            if (logEntry) {
                logEntry.classList.toggle('expanded');
            }
        }
    }

    async function handleDeleteLog(logId, logElement) {
        if (confirm('Are you sure you want to permanently delete this log entry?')) {
            try {
                await db.caseLogs.delete(logId);
                // Animate out and remove the element for a smooth UX
                logElement.style.transition = 'opacity 0.3s, transform 0.3s, max-height 0.3s 0.1s, padding 0.3s 0.1s, margin 0.3s 0.1s';
                logElement.style.opacity = '0';
                logElement.style.transform = 'scale(0.95)';
                logElement.style.maxHeight = '0';
                logElement.style.padding = '0';
                logElement.style.margin = '0';

                setTimeout(() => {
                    logElement.remove();
                    if (logHistoryContainer.children.length === 0) {
                        renderLogHistory([]); // Show the "No logs yet" message
                    }
                }, 400); // Corresponds to animation time

                showNotification('Log entry deleted.');
                await updateCasesCounter(); // The number of cases today has changed.
            } catch (error) {
                console.error('Failed to delete log entry:', error);
                showNotification('Error deleting log entry.', true);
            }
        }
    }

    function handleDuplicateBlueprint() {
        if (formBlueprint.id === null) {
            showNotification('Please load a blueprint to duplicate.', true);
            return;
        }
    
        // Create a deep copy and modify it
        const newBlueprint = JSON.parse(JSON.stringify(formBlueprint));
        newBlueprint.id = null; // This makes it a new, unsaved blueprint
        newBlueprint.formName = `${formBlueprint.formName} (Copy)`;
    
        // Load this new blueprint into the state
        formBlueprint = newBlueprint;
    
        // Update the UI to reflect the new, unsaved state
        formNameInput.value = formBlueprint.formName;
        formSubtitleInput.value = formBlueprint.formSubtitle;
        formSelector.value = 'new'; // Set dropdown to the "new" state
        duplicateFormBtn.disabled = true; // The new copy is unsaved, so it can't be duplicated yet
    
        render();
        loadAndRenderLogs(); // This will clear the logs for the new blueprint
    
        showNotification('Blueprint duplicated. You can now edit and save it as a new blueprint.');
        formNameInput.focus();
    }

    async function downloadLogHistory() {
        if (formBlueprint.id === null) {
            showNotification('Please save and select a blueprint to download its logs.', true);
            return;
        }

          const allLogs = await db.caseLogs.where({
            blueprintId: formBlueprint.id
        }).sortBy('timestamp');
        if (allLogs.length === 0) {
            showNotification('No logs for this blueprint to download.', true);
            return;
        }

        // Create CSV header from the fields of the CURRENT blueprint
        const headers = ['Timestamp', ...formBlueprint.fields.filter(f => f.type !== 'static-text').map(f => f.label), 'Full Output'];
        let csvContent = headers.join(',') + '\n';

        // Create rows
        allLogs.forEach(log => {
            const row = [new Date(log.timestamp).toISOString()];
            formBlueprint.fields.forEach(field => {
                if (field.type === 'static-text') return;
                let value = log.data[field.id] || '';
                if (Array.isArray(value)) {
                    value = value.join('; '); // Use semicolon for multi-select values
                }
                // Escape commas and quotes for CSV
                const escapedValue = `"${String(value).replace(/"/g, '""')}"`;
                row.push(escapedValue);
            });
            row.push(`"${log.fullOutput.replace(/"/g, '""')}"`);
            csvContent += row.join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `taco_log_history_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ===================================================================================
    // DATABASE AND EXPORT LOGIC
    // ===================================================================================

    async function saveCurrentBlueprint() {
        if (!formBlueprint.formName || formBlueprint.formName.trim() === '') {
            showNotification('Please provide a Form Name before saving.', true);
            formNameInput.focus();
            return;
        }

        // IMPORTANT: Create a "clean" deep copy of the state object before saving.
        // This prevents errors (like DataCloneError or the DataError you're seeing)
        // that occur when trying to save complex "live" objects to IndexedDB.
        // This is the same technique used when loading a blueprint.
        const blueprintToSave = JSON.parse(JSON.stringify(formBlueprint));
        blueprintToSave.formName = formBlueprint.formName.trim();

        // If this is a new blueprint (id is null), we must remove the id property
        // before calling put(). The IndexedDB spec does not allow providing a null
        // value for a key path when the store has a key generator (auto-incrementing).
        if (blueprintToSave.id === null) {
            delete blueprintToSave.id;
        }

        try {
            // Dexie's put method handles both add and update.
            const id = await db.blueprints.put(blueprintToSave);
            formBlueprint.id = id; // Update the state with the new ID if it was created.
            showNotification(`Blueprint "${blueprintToSave.formName}" saved successfully!`);
            await loadBlueprintsIntoSelector(); // Refresh the dropdown
            formSelector.value = id; // Select the newly saved item
            localStorage.setItem('lastUsedBlueprintId', id); // Save the ID to localStorage
        } catch (error) {
            console.error('Failed to save blueprint:', error);
            let userMessage = 'An error occurred while saving the blueprint. See console for details.';
            if (error.name === 'DataError') {
                userMessage = 'The blueprint data is invalid and could not be saved (DataError).';
            }
            showNotification(userMessage, true);
        }
    }

    async function loadBlueprintsIntoSelector() {
        const allBlueprints = await db.blueprints.orderBy('formName').toArray();
        formSelector.innerHTML = '<option value="new">-- Load or Start New --</option>'; // Clear and add placeholder
        allBlueprints.forEach(bp => {
            const option = document.createElement('option');
            option.value = bp.id;
            option.textContent = bp.formName;
            formSelector.appendChild(option);
        });
        formSelector.disabled = false;
    }

    formSelector.addEventListener('change', async (e) => {
        const selectedId = parseInt(e.target.value, 10);
        if (isNaN(selectedId)) { // This will be true for the "new" option
            // Reset to a new form state and clear local storage
            formBlueprint = {
                id: null,
                formName: 'New TACO Form',
                formSubtitle: 'A custom-built template for call outputs.',
                fields: []
            };
            duplicateFormBtn.disabled = true; // Disable when no blueprint is selected
        } else {
            localStorage.setItem('lastUsedBlueprintId', selectedId); // Save the ID to localStorage
            const bp = await db.blueprints.get(selectedId);
            if (bp) {
                // IMPORTANT: We must deep-clone the object from Dexie.
                // Dexie returns "live" objects that are not suitable for being
                // passed back into a put() operation directly.
                // JSON stringify/parse is a simple way to get a clean, plain object
                // and prevent DataCloneError on subsequent saves.
                formBlueprint = JSON.parse(JSON.stringify(bp));
                duplicateFormBtn.disabled = false; // Enable when a blueprint is loaded
            }
        }
        // Update UI with the loaded/new blueprint
        formNameInput.value = formBlueprint.formName;
        formSubtitleInput.value = formBlueprint.formSubtitle;
        render();
        await loadAndRenderLogs(); // Re-load logs for the newly selected blueprint
    });

    function exportAsJson() {
        // Create a clean copy, removing the database ID as it's not relevant for sharing.
        const blueprintToExport = JSON.parse(JSON.stringify(formBlueprint));
        delete blueprintToExport.id;

        const fileContent = JSON.stringify(blueprintToExport, null, 2); // Pretty-print the JSON
        const fileName = `${formBlueprint.formName.replace(/\s/g, '_') || 'taco_blueprint'}.json`;
        const blob = new Blob([fileContent], { type: 'application/json;charset=utf-8' });

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }

    async function handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                // Basic validation to ensure it's a plausible blueprint object
                if (typeof importedData.formName !== 'string' || !Array.isArray(importedData.fields)) {
                    throw new Error('Invalid blueprint format. Missing formName or fields array.');
                }

                // Load the data, but reset the ID to treat it as a new, unsaved blueprint
                formBlueprint = {
                    id: null,
                    formName: importedData.formName,
                    formSubtitle: importedData.formSubtitle || 'A custom-built template for call outputs.',
                    fields: importedData.fields || []
                };

                // Update the UI with the imported data
                formNameInput.value = formBlueprint.formName;
                formSubtitleInput.value = formBlueprint.formSubtitle;
                formSelector.value = 'new'; // Reset dropdown to "new" state
                render();
                loadAndRenderLogs(); // This will clear logs as the blueprint ID is null
                showNotification('Blueprint imported successfully! Remember to save it.');
            } catch (error) {
                console.error('Failed to import blueprint:', error);
                showNotification('Import failed. File may be corrupt or not a valid blueprint.', true);
            } finally {
                event.target.value = ''; // Reset file input to allow importing the same file again
            }
        };
        reader.onerror = () => {
            showNotification('Error reading file.', true);
            event.target.value = '';
        };
        reader.readAsText(file);
    }

    function exportAsHtml() {
        const blueprint = formBlueprint;
        const fileName = `${blueprint.formName.replace(/\s/g, '_') || 'taco_export'}.html`;

        // This function generates the entire HTML content as a string
        const fileContent = generateStandaloneHtml(blueprint);

        const blob = new Blob([fileContent], { type: 'text/html;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }

    function generateStandaloneHtml(blueprint) {
        // We will embed the necessary CSS and JS directly into the file.
        // This is a simplified version of the original TACO app's logic.
        // Dynamically generate the output template string based on the current fields
        const outputTemplateString = blueprint.fields
            .filter(field => field.type !== 'static-text')
            .map(field => `${field.label}: {{${field.id}}}`)
            .join('\n'); // Use \n to create a real newline character in the string

        const exportFieldRenderers = {
            'text': (field) => `<div class="form-group"><label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label><input type="text" id="${field.id}" name="${field.id}" placeholder="${field.placeholder || ''}"></div>`,
            'textarea': (field) => `<div class="form-group"><label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label><textarea id="${field.id}" name="${field.id}" rows="3" placeholder="${field.placeholder || ''}"></textarea></div>`,
            'static-text': (field) => {
                if (field.hoverInfo) {
                    const parsedInfo = parseSimpleMarkdown(field.hoverInfo);
                    const iconHtml = `<span class="info-icon">i<span class="tooltip-text">${parsedInfo}</span></span>`;
                    return `<div class="label-wrapper" style="align-items: center; margin-bottom: 1.5rem;"><p class="static-text-element" style="margin: 0; flex-grow: 1;">${field.label}</p>${iconHtml}</div>`;
                }
                return `<p class="static-text-element">${field.label}</p>`;
            },
            'searchable-dropdown': (field) => {
                const optionsHtml = field.options.map(opt => `<option value="${opt.value}">${opt.value}</option>`).join('');
                
                if (field.isMultiSelect) {
                    const selectHtml = `<select id="select-for-${field.id}" style="flex-grow: 1;"><option value="" disabled selected>${field.placeholder || 'Select...'}</option>${optionsHtml}</select>`;
                    const buttonHtml = `<button type="button" class="secondary" data-action="add-tag" data-field-id="${field.id}">Add</button>`;
                    const tagAreaHtml = `<div class="tag-area-wrapper">
                                            <div class="tag-container" id="tags-for-${field.id}"></div>
                                            <button type="button" class="remove-all-tags-btn" data-action="remove-all-tags" data-field-id="${field.id}">Clear All</button>
                                         </div>`;
                    const hiddenInputHtml = `<input type="hidden" id="${field.id}" name="${field.id}">`;
                    
                    return `<div class="form-group">
                                <label for="select-for-${field.id}">${field.label}${field.required ? ' *' : ''}</label>
                                <div class="tag-selector-input-group">${selectHtml}${buttonHtml}</div>
                                ${tagAreaHtml}
                                ${hiddenInputHtml}
                            </div>`;
                } else {
                    const selectHtml = `<select id="${field.id}" name="${field.id}"><option value="" disabled selected>${field.placeholder || 'Select...'}</option>${optionsHtml}</select>`;
                    return `<div class="form-group"><label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>${selectHtml}</div>`;
                }
            },
            'checkbox': (field) => {
                const checkboxes = field.options.map(opt => `<div><input type="checkbox" id="${field.id}-${toCamelCase(opt.value)}" name="${field.id}" value="${opt.value}"><label for="${field.id}-${toCamelCase(opt.value)}">${opt.value}</label></div>`).join('');
                return `<fieldset class="form-group"><legend>${field.label}${field.required ? ' *' : ''}</legend><div class="checkbox-group">${checkboxes}</div></fieldset>`;
            }
        };

        const generateFormFieldsHtml = () => {
            return blueprint.fields.map(field => {
                const renderer = exportFieldRenderers[field.type] || (() => '');
                return renderer(field);
            }).join('\n');
        };

        // The entire HTML file as a template literal
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${blueprint.formName}</title>
    <style>
        :root { --bg-dark: #282c34; --bg-light: #3a3f4b; --border-color: #4a505e; --text-primary: #e6e6e6; --text-secondary: #b3b3b3; --accent-color: #61afef; --danger-color: #e06c75; }
        body { background-color: var(--bg-dark); color: var(--text-primary); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 2rem; display: flex; justify-content: center; box-sizing: border-box; }
        .container { max-width: 800px; width: 100%; }
        .form-container, .output-container { background-color: var(--bg-light); padding: 2rem; border-radius: 8px; margin-bottom: 2rem; }
        .form-group, .fieldset { margin-bottom: 1.5rem; }
        label, legend { display: block; margin-bottom: 0.5rem; font-weight: bold; color: var(--text-secondary); }
        input[type="text"], select, textarea { width: 100%; padding: 0.75rem; border-radius: 4px; border: 1px solid var(--border-color); background-color: var(--bg-dark); color: var(--text-primary); font-size: 1rem; }
        .checkbox-group { display: flex; flex-wrap: wrap; gap: 10px 20px; padding-top: 0.5rem; }
        .checkbox-group div { display: flex; align-items: center; gap: 8px; }
        .label-wrapper { display: flex; align-items: center; gap: 8px; }
        .info-icon { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; background-color: var(--border-color); color: var(--bg-dark); font-weight: bold; font-size: 0.8em; cursor: help; flex-shrink: 0; }
        .info-icon .tooltip-text { visibility: hidden; width: 250px; background-color: var(--bg-dark); color: var(--text-primary); text-align: left; border-radius: 8px; padding: 10px 15px; position: absolute; z-index: 10; bottom: 140%; left: 50%; transform: translateX(-50%); opacity: 0; transition: opacity 0.3s; font-weight: normal; line-height: 1.4; box-shadow: 0 4px 6px rgba(0,0,0,0.2); border: 1px solid var(--border-color); white-space: pre-wrap; }
        .info-icon:hover .tooltip-text { visibility: visible; opacity: 1; }
        .info-icon .tooltip-text::after { content: ""; position: absolute; top: 100%; left: 50%; margin-left: -5px; border-width: 5px; border-style: solid; border-color: var(--bg-dark) transparent transparent transparent; }
        .info-icon .tooltip-text a { color: var(--accent-color); text-decoration: underline; }
        .info-icon .tooltip-text a:hover { color: #7cc0ff; }
        .checkbox-group label { font-weight: normal; }
        .static-text-element { color: var(--text-secondary); font-style: italic; margin: 0.5rem 0 1.5rem 0; padding: 0.75rem; background-color: var(--bg-dark); border-radius: 4px; border-left: 3px solid var(--accent-color); }
        .tag-area-wrapper { display: flex; align-items: flex-start; gap: 10px; margin-top: 10px; }
        .tag-container { flex-grow: 1; }
        .remove-all-tags-btn { padding: 5px 10px; font-size: 0.8em; font-weight: normal; background-color: transparent; color: var(--text-secondary); border: 1px solid var(--border-color); flex-shrink: 0; }
        .remove-all-tags-btn:hover { background-color: var(--danger-color); color: var(--bg-dark); border-color: var(--danger-color); }
        .tag-selector-input-group { display: flex; gap: 10px; }
        .tag-selector-input-group select { flex-grow: 1; }
        .tag-container { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; padding: 8px; background-color: var(--bg-dark); border-radius: 8px; min-height: 40px; border: 1px solid var(--border-color); }
        .tag { background-color: var(--accent-color); color: var(--bg-dark); padding: 5px 10px; border-radius: 15px; display: flex; align-items: center; gap: 8px; font-size: 0.9em; font-weight: bold; }
        .tag button { background: none; border: none; color: var(--bg-dark); cursor: pointer; padding: 0; font-size: 1.2em; line-height: 1; opacity: 0.7; }
        pre { white-space: pre-wrap; word-wrap: break-word; background-color: var(--bg-dark); padding: 1rem; border-radius: 4px; min-height: 150px; }
        .button-group { display: flex; gap: 1rem; }
        button { padding: 0.75rem 1.5rem; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: bold; }
        .primary { background-color: var(--accent-color); color: var(--bg-dark); }
        .secondary { background-color: var(--bg-light); color: var(--text-primary); border: 1px solid var(--border-color); }
        .form-header { text-align: center; margin-bottom: 2rem; }
        .form-header h1 { color: var(--accent-color); margin-bottom: 0.5rem; }
    </style>
</head>
<body>
<div class="container">
    <div class="form-header">
        <h1>${blueprint.formName}</h1>
        <p>${blueprint.formSubtitle}</p>
    </div>
    <div id="taco-form" class="form-container">
        ${generateFormFieldsHtml()}
    </div>
    <div class="output-container">
        <h2>Output</h2>
        <pre id="preview">Output will appear here...</pre>
    </div>
    <div class="button-group">
        <button id="copyBtn" class="primary">Copy Output</button>
        <button id="clearBtn" class="secondary">Clear Form</button>
    </div>
</div>
<script>
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('taco-form');
    const preview = document.getElementById('preview');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');
    // Use JSON.stringify to safely embed the template string,
    // preventing errors if it contains backticks or other special characters.
    const outputTemplate = ${JSON.stringify(outputTemplateString)};
    const fields = ${JSON.stringify(blueprint.fields)};

    function generateOutput() {
        let output = outputTemplate;
        fields.forEach(field => {
            if (field.type === 'static-text') return;
            const element = document.getElementById(field.id);
            let value = 'N/A';
            if (field.type === 'checkbox') {
                const checked = Array.from(document.querySelectorAll(\`input[name="\${field.id}"]:checked\`)).map(cb => cb.value).join(', ');
                value = checked || 'None';
            } else if (element && element.value) {
                value = element.value;
            }
            output = output.replace(new RegExp(\`{{${field.id}}}\`, 'g'), value);
        });
        preview.textContent = output;
    }

    form.addEventListener('input', generateOutput);

    form.addEventListener('click', (e) => {
        const addTagButton = e.target.closest('button[data-action="add-tag"]');
        const removeTagButton = e.target.closest('button[data-action="remove-tag"]');
        const removeAllButton = e.target.closest('button[data-action="remove-all-tags"]');
    
        if (addTagButton) {
            const fieldId = addTagButton.dataset.fieldId;
            const select = document.getElementById(\`select-for-\${fieldId}\`);
            const hiddenInput = document.getElementById(fieldId);
            const tagContainer = document.getElementById(\`tags-for-\${fieldId}\`);
            
            if (select && hiddenInput && tagContainer && select.value) {
                const valueToAdd = select.value;
                const currentValues = hiddenInput.value ? hiddenInput.value.split(',') : [];
    
                if (!currentValues.includes(valueToAdd)) {
                    const tag = document.createElement('span');
                    tag.className = 'tag';
                    tag.dataset.value = valueToAdd;
                    tag.innerHTML = \`\${valueToAdd} <button type="button" data-action="remove-tag">&times;</button>\`;
                    tagContainer.appendChild(tag);
    
                    currentValues.push(valueToAdd);
                    hiddenInput.value = currentValues.join(',');
                    hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                select.value = '';
            }
        }
    
        if (removeTagButton) {
            const tagEl = removeTagButton.closest('.tag');
            const formGroup = removeTagButton.closest('.form-group');
            const hiddenInput = formGroup.querySelector('input[type="hidden"]');
            const valueToRemove = tagEl.dataset.value;
            
            if (tagEl && hiddenInput) {
                tagEl.remove();
                let currentValues = hiddenInput.value ? hiddenInput.value.split(',') : [];
                currentValues = currentValues.filter(v => v !== valueToRemove);
                hiddenInput.value = currentValues.join(',');
                hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        if (removeAllButton) {
            const fieldId = removeAllButton.dataset.fieldId;
            const tagContainer = document.getElementById(\`tags-for-\${fieldId}\`);
            const hiddenInput = document.getElementById(fieldId);
            if (tagContainer && hiddenInput) {
                tagContainer.innerHTML = '';
                hiddenInput.value = '';
                hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    });
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(preview.textContent).then(() => {
            alert('Copied to clipboard!');
        }, () => {
            alert('Failed to copy.');
        });
    });

    clearBtn.addEventListener('click', () => {
        form.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
            else el.value = '';
        });
        generateOutput();
    });

    generateOutput(); // Initial generation
});
</script>
</body>
</html>`;
    }

    // ===================================================================================
    // INITIALIZATION
    // ===================================================================================
    async function initializeApp() {
        // Set initial values from state object
        formNameInput.value = formBlueprint.formName;
        formSubtitleInput.value = formBlueprint.formSubtitle;

        // Initialize SortableJS for drag-and-drop functionality on the field list
        new Sortable(fieldListContainer, {
            animation: 150, // Animation speed
            handle: '.drag-handle', // Use the '⠿' icon as the drag handle
            onEnd: (evt) => {
                // The item was moved. evt.oldIndex and evt.newIndex are the original and new positions.
                // Update the formBlueprint array to reflect the new order.
                const [movedItem] = formBlueprint.fields.splice(evt.oldIndex, 1);
                formBlueprint.fields.splice(evt.newIndex, 0, movedItem);

                // Re-render everything to update data-indexes and the live preview.
                render();
            }
        });

        // 1. Populate the blueprint selector first
        await loadBlueprintsIntoSelector();

        // 2. Restore UI states
        const isCollapsed = localStorage.getItem('tacoBuilderControlsCollapsed') === 'true';
        if (isCollapsed) {
            builderContainer.classList.add('controls-collapsed');
            toggleControlsBtn.textContent = '»';
            toggleControlsBtn.title = 'Expand Controls';
        }

        // 3. Try to load the last used blueprint from localStorage
        // We wrap this in a try/catch to make startup more robust.
        try {
            const lastUsedBlueprintId = localStorage.getItem('lastUsedBlueprintId');
            let blueprintLoaded = false;
            if (lastUsedBlueprintId) {
                const blueprintId = parseInt(lastUsedBlueprintId, 10);
                // Check if the option actually exists in the selector
                if (!isNaN(blueprintId) && formSelector.querySelector(`[value="${blueprintId}"]`)) {
                    formSelector.value = blueprintId;
                    await formSelector.dispatchEvent(new Event('change')); // Programmatically trigger the change event
                    blueprintLoaded = true;
                }
            }

            // 4. If no blueprint was loaded from storage, do the initial render for a new form
            if (!blueprintLoaded) {
                render();
                await loadAndRenderLogs();
            }
        } catch (error) {
            console.error("Error during blueprint auto-load:", error);
            // Fallback to a clean state if auto-load fails
            render();
            await loadAndRenderLogs();
        }
    }

    initializeApp();
});