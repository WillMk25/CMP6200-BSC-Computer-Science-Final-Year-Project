// FoodFlag - popup.js

// Default allergen list
const DEFAULT_ALLERGEN_LIST = [
    'peanut', 'peanuts',
    'milk', 'dairy',
    'egg', 'eggs',
    'soy', 'soya', 'soybean',
    'wheat', 'gluten',
    'fish',
    'shellfish', 'crustacean', 'shrimp', 'crab', 'lobster',
    'tree nut', 'tree nuts', 'almond', 'cashew', 'walnut', 'pecan', 'hazelnut',
    'sesame',
    'mustard',
    'celery',
    'lupin',
    'sulphite', 'sulphites', 'sulfite', 'sulfites'
];

// Bidirectional automatically
function makeBidirectional(map) {
    const result = {};
    for (const [key, values] of Object.entries(map)) {
        if (!result[key]) result[key] = new Set();
        values.forEach(v => {
            result[key].add(v);
            if (!result[v]) result[v] = new Set();
            result[v].add(key);
        });
    }
    const final = {};
    for (const [key, set] of Object.entries(result)) {
        final[key] = Array.from(set);
    }
    return final;
}

// Loads and displays everything
function loadAllergens() {
    chrome.storage.sync.get(['userAllergens'], (result) => {
        const allergens = result.userAllergens || DEFAULT_ALLERGEN_LIST;
        displayAllergens(allergens);
        displaySynonyms(allergens);
        displayCrossReactive(allergens);
    });
}

// Displays allergen tags
function displayAllergens(allergens) {
    const allergenList = document.getElementById('allergenList');
    const emptyState = document.getElementById('emptyState');
    allergenList.innerHTML = '';

    if (allergens.length === 0) {
        emptyState.classList.add('show');
        allergenList.style.display = 'none';
    } else {
        emptyState.classList.remove('show');
        allergenList.style.display = 'flex';
        allergens.forEach(allergen => {
            const tag = document.createElement('div');
            tag.className = 'allergen-tag';
            tag.innerHTML = `
                <span>${allergen}</span>
                <button class="remove" data-allergen="${allergen}">×</button>
            `;
            allergenList.appendChild(tag);
        });
        document.querySelectorAll('.remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                removeAllergen(e.target.getAttribute('data-allergen'));
            });
        });
    }
}

// Displays synonym expanded words in popup
function displaySynonyms(allergens) {
    const section = document.getElementById('synonymSection');
    const list = document.getElementById('synonymList');
    const synonymMapBi = makeBidirectional(SYNONYM_MAP);
    const synonymSet = new Set();

    allergens.forEach(allergen => {
        const synonyms = synonymMapBi[allergen.toLowerCase()];
        if (synonyms) {
            synonyms.forEach(s => {
                if (!allergens.includes(s)) synonymSet.add(s.toLowerCase());
            });
        }
    });

    list.innerHTML = '';
    if (synonymSet.size > 0) {
        section.style.display = 'block';
        synonymSet.forEach(synonym => {
            const tag = document.createElement('div');
            tag.className = 'allergen-tag';
            tag.style.background = '#ffe0e0';
            tag.style.color = '#cc0000';
            tag.innerHTML = `<span>${synonym}</span>`;
            list.appendChild(tag);
        });
    } else {
        section.style.display = 'none';
    }
}

// Displays cross reactive ingredients in popup
function displayCrossReactive(allergens) {
    const section = document.getElementById('crossReactiveSection');
    const list = document.getElementById('crossReactiveList');
    const crossMapBi = makeBidirectional(CROSS_REACTIVITY_MAP);

    const synonymMapBi = makeBidirectional(SYNONYM_MAP);
    const expandedSet = new Set(allergens.map(a => a.toLowerCase()));
    allergens.forEach(allergen => {
        const synonyms = synonymMapBi[allergen.toLowerCase()];
        if (synonyms) synonyms.forEach(s => expandedSet.add(s.toLowerCase()));
    });

    const crossSet = new Set();
    expandedSet.forEach(allergen => {
        const related = crossMapBi[allergen];
        if (related) {
            related.forEach(item => {
                if (!expandedSet.has(item.toLowerCase())) {
                    crossSet.add(item.toLowerCase());
                }
            });
        }
    });

    list.innerHTML = '';
    if (crossSet.size > 0) {
        section.style.display = 'block';
        crossSet.forEach(ingredient => {
            const tag = document.createElement('div');
            tag.className = 'cross-reactive-tag';
            tag.textContent = ingredient;
            list.appendChild(tag);
        });
    } else {
        section.style.display = 'none';
    }
}

// Add allergen
function addAllergen() {
    const input = document.getElementById('allergenInput');
    const allergen = input.value.trim().toLowerCase();
    if (!allergen) { alert('Please enter an allergen'); return; }

    chrome.storage.sync.get(['userAllergens'], (result) => {
        let allergens = result.userAllergens || DEFAULT_ALLERGEN_LIST;
        if (allergens.includes(allergen)) { alert('This allergen is already in your list'); return; }
        allergens.push(allergen);
        chrome.storage.sync.set({ userAllergens: allergens }, () => {
            input.value = '';
            loadAllergens();
            notifyContentScript();
        });
    });
}

// Remove allergen
function removeAllergen(allergen) {
    chrome.storage.sync.get(['userAllergens'], (result) => {
        let allergens = (result.userAllergens || DEFAULT_ALLERGEN_LIST).filter(a => a !== allergen);
        chrome.storage.sync.set({ userAllergens: allergens }, () => {
            loadAllergens();
            notifyContentScript();
        });
    });
}

// Reset to defaults
function resetToDefaults() {
    if (confirm('Reset to default allergen list? This will remove all custom allergens.')) {
        chrome.storage.sync.set({ userAllergens: DEFAULT_ALLERGEN_LIST }, () => {
            loadAllergens();
            notifyContentScript();
        });
    }
}

// Clear all
function clearAll() {
    if (confirm('Remove all allergens? The extension will not flag any ingredients.')) {
        chrome.storage.sync.set({ userAllergens: [] }, () => {
            loadAllergens();
            notifyContentScript();
        });
    }
}

// Nudges content script to reload
function notifyContentScript() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'reloadAllergens' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Content script not available on this page');
                }
            });
        }
    });
}
//Synonym sorting pool
function buildSuggestionPool() {
    const pool = [];
    const seen = new Set();

    DEFAULT_ALLERGEN_LIST.forEach(name => {
        const key = name.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            pool.push({ name: key, parent: null });
        }
    });

    // Every synonym, labelled with its parent allergen
    Object.entries(SYNONYM_MAP).forEach(([parent, synonyms]) => {
        synonyms.forEach(syn => {
            const key = syn.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                pool.push({ name: key, parent: parent });
            }
        });
        // Ensures the parent key is in the pool
        const pKey = parent.toLowerCase();
        if (!seen.has(pKey)) {
            seen.add(pKey);
            pool.push({ name: pKey, parent: null });
        }
    });

    return pool;
}

const SUGGESTION_POOL = buildSuggestionPool();

// Prefix matching sorting
function filterSuggestions(query, pool) {
    const q = query.toLowerCase();
    const prefix = pool.filter(e => e.name.startsWith(q));
    const rest   = pool.filter(e => !e.name.startsWith(q) && e.name.includes(q));
    return [...prefix, ...rest].slice(0, 8);
}

// For highlighting
function highlightMatch(name, query) {
    const q = query.toLowerCase();
    const idx = name.toLowerCase().indexOf(q);
    if (idx !== -1) {
        return name.slice(0, idx)
            + `<mark>${name.slice(idx, idx + q.length)}</mark>`
            + name.slice(idx + q.length);
    }
    return name;
}

let activeIndex = -1;

function openDropdown(query) {
    const dropdown = document.getElementById('autocompleteDropdown');
    if (!query || query.length < 1) {
        closeDropdown();
        return;
    }

    // Score and filter
    const results = filterSuggestions(query, SUGGESTION_POOL);

    if (results.length === 0) {
        closeDropdown();
        return;
    }

    activeIndex = -1;
    dropdown.innerHTML = '';
    results.forEach((entry, i) => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.dataset.index = i;
        item.dataset.value = entry.name;

        const label = document.createElement('span');
        label.className = 'match-text';
        label.innerHTML = highlightMatch(entry.name, query);

        item.appendChild(label);

        if (entry.parent) {
            const parentLabel = document.createElement('span');
            parentLabel.className = 'match-parent';
            parentLabel.innerHTML = `<span>${entry.parent}</span>`;
            item.appendChild(parentLabel);
        }

        item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            selectSuggestion(entry.name);
        });

        dropdown.appendChild(item);
    });

    dropdown.classList.add('open');
}

function closeDropdown() {
    const dropdown = document.getElementById('autocompleteDropdown');
    dropdown.classList.remove('open');
    dropdown.innerHTML = '';
    activeIndex = -1;
}

function selectSuggestion(value) {
    const input = document.getElementById('allergenInput');
    input.value = value;
    closeDropdown();
    input.focus();
}

function moveActive(direction) {
    const dropdown = document.getElementById('autocompleteDropdown');
    const items = dropdown.querySelectorAll('.autocomplete-item');
    if (items.length === 0) return;

    items[activeIndex]?.classList.remove('active');
    activeIndex = (activeIndex + direction + items.length) % items.length;
    items[activeIndex].classList.add('active');
    items[activeIndex].scrollIntoView({ block: 'nearest' });
}

function initAutocomplete() {
    const input = document.getElementById('allergenInput');

    input.addEventListener('input', () => openDropdown(input.value.trim()));

    input.addEventListener('keydown', (e) => {
        const dropdown = document.getElementById('autocompleteDropdown');
        if (!dropdown.classList.contains('open')) return;

        if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
        else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            const active = dropdown.querySelector('.autocomplete-item.active');
            if (active) selectSuggestion(active.dataset.value);
        }
        else if (e.key === 'Escape') closeDropdown();
    });

    input.addEventListener('blur', () => {
        setTimeout(closeDropdown, 150);
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadAllergens();
    initAutocomplete();
    document.getElementById('addAllergen').addEventListener('click', addAllergen);
    document.getElementById('allergenInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const dropdown = document.getElementById('autocompleteDropdown');
            if (!dropdown.classList.contains('open') || activeIndex < 0) addAllergen();
        }
    });
    document.getElementById('resetDefaults').addEventListener('click', resetToDefaults);
    document.getElementById('clearAll').addEventListener('click', clearAll);
});
