console.log('JS data loaded');

const addPebbleBtn = document.querySelector('.add-pebble-btn');
const pebbleInput = document.querySelector('#pebble-input');
const pebbleMainList = document.querySelector('[data-pebble-main-list]');
const pebbleCounter = document.querySelector('.pebble-counter');

const pebbleState = { schemaVersion: 2, data: [] };
let activePebbleId = null;

// State operations: no DOM or persistence access.
function replacePebbles(pebbles) {
    pebbleState.data = pebbles;
}

function getActivePebble() {
    return pebbleState.data.find(pebble => pebble.id === activePebbleId);
}

function selectPebble(id) {
    if (id !== null && !pebbleState.data.some(pebble => pebble.id === id)) return false;
    activePebbleId = id;
    return true;
}

// Array order is persisted recency; IDs remain stable identifiers.
function movePebbleToTop(id) {
    const index = pebbleState.data.findIndex(pebble => pebble.id === id);
    if (index < 0) return false;
    if (index > 0) {
        const [pebble] = pebbleState.data.splice(index, 1);
        pebbleState.data.unshift(pebble);
    }
    return true;
}

function addMainPebble(description) {
    pebbleState.data.unshift({ id: Date.now(), description, isSettled: false, subpebbles: [] });
}

function deleteMainPebble(id) {
    if (!pebbleState.data.some(pebble => pebble.id === id)) return false;
    pebbleState.data = pebbleState.data.filter(pebble => pebble.id !== id);
    if (activePebbleId === id) selectPebble(null);
    return true;
}

function renameMainPebble(id, description) {
    if (typeof description !== 'string' || !description.trim()) return false;
    const pebble = pebbleState.data.find(item => item.id === id);
    if (!pebble) return false;
    pebble.description = description;
    movePebbleToTop(id);
    return true;
}

function renameSubPebble(id, subId, description) {
    if (typeof description !== 'string' || !description.trim()) return false;
    const parent = pebbleState.data.find(pebble => pebble.id === id);
    const subpebble = parent?.subpebbles.find(item => item.id === subId);
    if (!subpebble) return false;
    subpebble.description = description;
    movePebbleToTop(id);
    return true;
}

function addSubPebble(id, description) {
    const pebble = pebbleState.data.find(item => item.id === id);
    if (!pebble) return false;
    pebble.subpebbles.push({ id: Date.now(), description, isSettled: false });
    movePebbleToTop(id);
    return true;
}

function deleteSubPebble(id, subId) {
    const pebble = pebbleState.data.find(item => item.id === id);
    if (!pebble || !pebble.subpebbles.some(item => item.id === subId)) return false;
    pebble.subpebbles = pebble.subpebbles.filter(item => item.id !== subId);
    return true;
}

function toggleMainPebbleSettled(id) {
    const pebble = pebbleState.data.find(item => item.id === id);
    if (!pebble) return false;
    pebble.isSettled = !pebble.isSettled;
    return true;
}

function toggleSubPebbleSettled(id, subId) {
    const parent = pebbleState.data.find(pebble => pebble.id === id);
    const subpebble = parent?.subpebbles.find(item => item.id === subId);
    if (!subpebble) return false;
    subpebble.isSettled = !subpebble.isSettled;
    return true;
}

// Persistence: schemaVersion selects migration; V2 validation never rewrites data.
function validatePebble(pebble) {
    if (!pebble || pebble.id == null || typeof pebble.description !== 'string' ||
        typeof pebble.isSettled !== 'boolean') {
        throw new Error('Invalid pebble data');
    }
}

function validateV2Data(state) {
    if (state.schemaVersion !== 2 || !Array.isArray(state.data)) {
        throw new Error('Invalid V2 pebble list');
    }
    state.data.forEach(pebble => {
        validatePebble(pebble);
        if (!Array.isArray(pebble.subpebbles)) throw new Error('Invalid sub-pebble list');
        pebble.subpebbles.forEach(validatePebble);
    });
}

function migrateV1Pebble(pebble) {
    if (!pebble || pebble.id == null || typeof pebble.text !== 'string') {
        throw new Error('Invalid V1 pebble data');
    }
    return { id: pebble.id, description: pebble.text, isSettled: false };
}

function migratePebbleData(v1Data) {
    if (!Array.isArray(v1Data)) throw new Error('Invalid V1 pebble list');
    return {
        schemaVersion: 2,
        data: v1Data.map(pebble => {
            const migrated = migrateV1Pebble(pebble);
            if (!Array.isArray(pebble.subPebbles)) throw new Error('Invalid V1 sub-pebble list');
            return { ...migrated, subpebbles: pebble.subPebbles.map(migrateV1Pebble) };
        })
    };
}

function savePebbles(state) {
    localStorage.setItem('pebbles', JSON.stringify(state));
}

function loadPebbles() {
    const stored = localStorage.getItem('pebbles');
    if (!stored) return { data: [], migrated: false, corrupted: false };
    let parsed;
    let version;
    try {
        parsed = JSON.parse(stored);
        // Original V1 storage was an unversioned array.
        version = Array.isArray(parsed) ? 1 : parsed?.schemaVersion;
        if (version === 2) {
            validateV2Data(parsed);
            return { data: parsed.data, migrated: false, corrupted: false };
        }
        if (version === 1) {
            const migrated = migratePebbleData(Array.isArray(parsed) ? parsed : parsed.data);
            return { data: migrated.data, migrated: true, corrupted: false };
        }
    } catch (error) {
        localStorage.removeItem('pebbles');
        return { data: [], migrated: false, corrupted: true };
    }
    // Stop initialization without removing or overwriting an unsupported format.
    throw new Error('Unsupported Pebble schemaVersion: ' + String(version));
}

// Presentation state only; drafts never enter the persisted V2 model.
const editDrafts = new Map();
let subpebbleDraft = '';

function itemKey(id, subId) {
    return JSON.stringify([id, subId ?? null]);
}

// Rendering: build the view without listeners, state changes, or storage writes.
function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
}

function createActionElement(tag, action, id, text, subId) {
    const element = createElement(tag, '', text);
    element.dataset.action = action;
    if (id != null) element.dataset.pebbleId = String(id);
    if (subId != null) element.dataset.subPebbleId = String(subId);
    if (tag === 'button') element.type = 'button';
    return element;
}

function updateSettledAppearance(row, isSettled) {
    row.querySelector('[data-description]').classList.toggle('settled-description', isSettled);
    row.querySelector('input[type="checkbox"]').checked = isSettled;
}

function createItemRow(parent, item, isSubpebble = false, overview = false) {
    const subId = isSubpebble ? item.id : undefined;
    const key = itemKey(parent.id, subId);
    const editing = editDrafts.has(key);
    const row = createElement('li', 'item-row' + (editing ? ' is-editing' : ''));
    row.dataset.itemKey = key;
    const content = createElement('div', 'item-content');
    if (editing) {
        const label = createElement('label', 'field-label', 'Edit ' + (isSubpebble ? 'subpebble' : 'Pebble') + ' description');
        const input = createActionElement('input', 'edit-input', parent.id, null, subId);
        input.type = 'text';
        input.value = editDrafts.get(key);
        input.dataset.description = '';
        label.appendChild(input);
        content.appendChild(label);
        const help = createElement('p', 'edit-help', 'Enter to save \u00b7 Escape to cancel');
        content.appendChild(help);
        const error = createElement('p', 'edit-error');
        error.setAttribute('role', 'alert');
        error.hidden = true;
        content.appendChild(error);
        const editorActions = createElement('div', 'editor-actions');
        const save = createActionElement('button', 'save-edit', parent.id, 'Save', subId);
        save.className = 'primary-btn';
        editorActions.appendChild(save);
        editorActions.appendChild(createActionElement('button', 'cancel-edit', parent.id, 'Cancel', subId));
        content.appendChild(editorActions);
    } else {
        const description = createActionElement('button', overview ? 'select' : 'start-edit', parent.id, item.description, subId);
        description.className = 'description-button';
        description.dataset.description = '';
        description.setAttribute('aria-label', (overview ? 'Open Pebble: ' : 'Edit description: ') + item.description);
        content.appendChild(description);
        if (overview) content.appendChild(createElement('p', 'item-meta', parent.subpebbles.length + (parent.subpebbles.length === 1 ? ' subpebble \u00b7 Open to focus' : ' subpebbles \u00b7 Open to focus')));
    }
    row.appendChild(content);
    const actions = createElement('div', 'item-actions');
    const label = createElement('label', 'settled-control');
    const checkbox = createActionElement('input', isSubpebble ? 'settle-sub' : 'settle-main', parent.id, null, subId);
    checkbox.type = 'checkbox';
    checkbox.setAttribute('aria-label', 'Settled: ' + item.description);
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode('Settled'));
    actions.appendChild(label);
    if (!editing) {
        const edit = createActionElement('button', 'start-edit', parent.id, 'Edit', subId);
        edit.setAttribute('aria-label', 'Edit ' + item.description);
        actions.appendChild(edit);
    }
    row.appendChild(actions);
    const destructive = createElement('div', 'destructive-actions');
    const remove = createActionElement('button', isSubpebble ? 'delete-sub' : 'delete-main', parent.id, 'Delete', subId);
    remove.className = 'delete-btn';
    remove.setAttribute('aria-label', 'Delete ' + item.description);
    destructive.appendChild(remove);
    row.appendChild(destructive);
    updateSettledAppearance(row, item.isSettled);
    return row;
}

function renderDefault(pebbles) {
    document.querySelector('.add-pebble-container').hidden = false;
    document.querySelector('#list-heading').textContent = 'Your Pebbles';
    pebbleMainList.classList.remove('focus-mode');
    if (!pebbles.length) {
        const empty = createElement('div', 'empty-state');
        empty.appendChild(createElement('h3', '', 'A little room for your day.'));
        empty.appendChild(createElement('p', '', 'Add a Pebble above. Break it into smaller steps when you are ready.'));
        pebbleMainList.appendChild(empty);
    } else {
        const list = createElement('ul', 'pebble-list');
        pebbles.forEach(pebble => list.appendChild(createItemRow(pebble, pebble, false, true)));
        pebbleMainList.appendChild(list);
    }
    pebbleCounter.textContent = pebbles.length + (pebbles.length === 1 ? ' Pebble in your day' : ' Pebbles in your day');
}

function renderFocus(pebble) {
    document.querySelector('.add-pebble-container').hidden = true;
    document.querySelector('#list-heading').textContent = 'One Pebble at a time';
    pebbleMainList.classList.add('focus-mode');
    const back = createActionElement('button', 'back', null, '\u2190 All Pebbles');
    back.className = 'back-btn';
    pebbleMainList.appendChild(back);
    const main = createElement('ul', 'pebble-list focus-pebble');
    main.appendChild(createItemRow(pebble, pebble));
    pebbleMainList.appendChild(main);
    const section = createElement('section', 'subpebble-section');
    section.appendChild(createElement('h3', '', 'Small steps'));
    section.appendChild(createElement('p', 'section-note', 'Give this Pebble a few manageable pieces.'));
    const label = createElement('label', 'field-label', 'Add a subpebble');
    label.htmlFor = 'subpebble-input';
    section.appendChild(label);
    const addRow = createElement('div', 'add-row');
    const input = createActionElement('input', 'add-sub-input', pebble.id);
    input.type = 'text';
    input.id = 'subpebble-input';
    input.className = 'sub-pebble-input';
    input.placeholder = 'A small next step';
    input.value = subpebbleDraft;
    addRow.appendChild(input);
    const add = createActionElement('button', 'add-sub', pebble.id, 'Add subpebble');
    add.className = 'primary-btn';
    addRow.appendChild(add);
    section.appendChild(addRow);
    if (pebble.subpebbles.length) {
        const list = createElement('ul', 'pebble-list sub-pebble-list-ul');
        pebble.subpebbles.forEach(sub => list.appendChild(createItemRow(pebble, sub, true)));
        section.appendChild(list);
    } else {
        section.appendChild(createElement('p', 'empty-subpebbles', 'No small steps yet. Add one whenever it helps.'));
    }
    pebbleMainList.appendChild(section);
    pebbleCounter.textContent = pebble.subpebbles.length + (pebble.subpebbles.length === 1 ? ' subpebble in this Pebble' : ' subpebbles in this Pebble');
}

function mainPebbleRender() {
    pebbleMainList.innerHTML = '';
    const activePebble = getActivePebble();
    if (activePebble) renderFocus(activePebble);
    else renderDefault(pebbleState.data);
}

// Event handling: coordinate state operations, persistence, and rendering.
function persistAndRender() {
    savePebbles(pebbleState);
    mainPebbleRender();
}

function handleAddPebble() {
    const description = pebbleInput.value.trim();
    if (!description) return;
    addMainPebble(description);
    persistAndRender();
    pebbleInput.value = '';
    pebbleInput.focus();
}

function handleMainInputKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleAddPebble();
    }
}

function resolveItem(target) {
    const parent = pebbleState.data.find(pebble => String(pebble.id) === target.dataset.pebbleId);
    const isSubpebble = target.dataset.subPebbleId !== undefined;
    const item = isSubpebble ? parent?.subpebbles.find(sub => String(sub.id) === target.dataset.subPebbleId) : parent;
    return { parent, item, isSubpebble };
}

function focusItemControl(key, action) {
    const row = Array.from(pebbleMainList.querySelectorAll('[data-item-key]')).find(element => element.dataset.itemKey === key);
    const control = row?.querySelector('[data-action="' + action + '"]');
    control?.focus();
    if (action === 'edit-input') control?.select();
}

function beginEdit(target) {
    const { parent, item, isSubpebble } = resolveItem(target);
    if (!item) return;
    const key = itemKey(parent.id, isSubpebble ? item.id : undefined);
    if (!editDrafts.has(key)) editDrafts.set(key, item.description);
    mainPebbleRender();
    focusItemControl(key, 'edit-input');
}

function cancelEdit(target) {
    const row = target.closest('[data-item-key]');
    if (!row) return;
    const key = row.dataset.itemKey;
    editDrafts.delete(key);
    mainPebbleRender();
    focusItemControl(key, 'start-edit');
}

function saveEdit(target) {
    const row = target.closest('[data-item-key]');
    const input = row?.querySelector('[data-action="edit-input"]');
    if (!input) return;
    const error = row.querySelector('.edit-error');
    input.setCustomValidity('');
    if (!input.value.trim()) {
        error.textContent = 'Please give this item a description.';
        error.hidden = false;
        input.setAttribute('aria-invalid', 'true');
        input.setCustomValidity('Description cannot be empty.');
        input.focus();
        return;
    }
    const { parent, item, isSubpebble } = resolveItem(input);
    if (!item) return;
    const edited = isSubpebble ? renameSubPebble(parent.id, item.id, input.value) : renameMainPebble(item.id, input.value);
    if (!edited) return;
    const key = row.dataset.itemKey;
    editDrafts.delete(key);
    persistAndRender();
    focusItemControl(key, 'start-edit');
}

function handleAddSubpebble(target) {
    const { parent } = resolveItem(target);
    const input = pebbleMainList.querySelector('.sub-pebble-input');
    if (!parent || !input || !input.value.trim()) return;
    if (!addSubPebble(parent.id, input.value.trim())) return;
    subpebbleDraft = '';
    persistAndRender();
    pebbleMainList.querySelector('.sub-pebble-input')?.focus();
}

function handleListClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target || !pebbleMainList.contains(target)) return;
    const { parent, item, isSubpebble } = resolveItem(target);
    switch (target.dataset.action) {
        case 'select':
            if (item && selectPebble(item.id)) {
                editDrafts.clear();
                subpebbleDraft = '';
                mainPebbleRender();
                pebbleMainList.querySelector('.back-btn')?.focus();
            }
            break;
        case 'back':
            editDrafts.clear();
            subpebbleDraft = '';
            selectPebble(null);
            mainPebbleRender();
            document.querySelector('#list-heading').focus();
            break;
        case 'start-edit': beginEdit(target); break;
        case 'save-edit': saveEdit(target); break;
        case 'cancel-edit': cancelEdit(target); break;
        case 'add-sub': handleAddSubpebble(target); break;
        case 'delete-main':
        case 'delete-sub':
            if (!item) return;
            if (isSubpebble ? deleteSubPebble(parent.id, item.id) : deleteMainPebble(item.id)) {
                editDrafts.delete(itemKey(parent.id, isSubpebble ? item.id : undefined));
                if (!isSubpebble) {
                    // Remove presentation drafts belonging to the deleted parent.
                    for (const key of editDrafts.keys()) if (JSON.parse(key)[0] === item.id) editDrafts.delete(key);
                    if (activePebbleId === null) subpebbleDraft = '';
                }
                persistAndRender();
                document.querySelector('#list-heading').focus();
            }
            break;
    }
}

function handleSettledChange(event) {
    const target = event.target;
    if (!pebbleMainList.contains(target) || !['settle-main', 'settle-sub'].includes(target.dataset.action)) return;
    const { parent, item, isSubpebble } = resolveItem(target);
    if (!item) return;
    const toggled = isSubpebble ? toggleSubPebbleSettled(parent.id, item.id) : toggleMainPebbleSettled(item.id);
    if (!toggled) return;
    savePebbles(pebbleState);
    // No full render: preserve every unfinished description and add-input draft.
    updateSettledAppearance(target.closest('[data-item-key]'), item.isSettled);
}

function handleListInput(event) {
    const target = event.target;
    if (target.dataset.action === 'add-sub-input') subpebbleDraft = target.value;
    if (target.dataset.action === 'edit-input') {
        editDrafts.set(target.closest('[data-item-key]').dataset.itemKey, target.value);
        target.setCustomValidity('');
        target.removeAttribute('aria-invalid');
        target.closest('[data-item-key]').querySelector('.edit-error').hidden = true;
    }
}

function handleListKeydown(event) {
    const target = event.target;
    if (target.dataset.action === 'edit-input') {
        if (event.key === 'Enter') { event.preventDefault(); saveEdit(target); }
        if (event.key === 'Escape') { event.preventDefault(); cancelEdit(target); }
    } else if (target.dataset.action === 'add-sub-input' && event.key === 'Enter') {
        event.preventDefault();
        handleAddSubpebble(target);
    }
}

function registerEventHandlers() {
    addPebbleBtn.addEventListener('click', handleAddPebble);
    pebbleInput.addEventListener('keydown', handleMainInputKeydown);
    pebbleMainList.addEventListener('click', handleListClick);
    pebbleMainList.addEventListener('keydown', handleListKeydown);
    pebbleMainList.addEventListener('input', handleListInput);
    pebbleMainList.addEventListener('change', handleSettledChange);
}

function initializePebble() {
    const loaded = loadPebbles();
    replacePebbles(loaded.data);
    selectPebble(null);
    if (loaded.migrated) savePebbles(pebbleState);
    if (loaded.corrupted) {
        console.log('Corrupted storage. Resetting.');
        alert('Your saved Pebbles were corrupted and have been reset.');
    }
    registerEventHandlers();
    mainPebbleRender();
}

initializePebble();
