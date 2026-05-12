// FoodFlag - content.js

// Tooltip
function injectTooltipStyles() {
    if (document.getElementById('ff-tooltip-styles')) return;
    const style = document.createElement('style');
    style.id = 'ff-tooltip-styles';
    style.textContent = `
        .ff-tooltip {
            position: fixed;
            background: #222;
            color: #fff;
            padding: 6px 10px;
            border-radius: 5px;
            font-size: 13px;
            font-weight: normal;
            max-width: 280px;
            z-index: 9999999;
            pointer-events: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            line-height: 1.4;
        }
    `;
    document.head.appendChild(style);

    const tooltip = document.createElement('div');
    tooltip.className = 'ff-tooltip';
    tooltip.id = 'ff-tooltip';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);

    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('[data-ff-tooltip]');
        if (target) {
            tooltip.textContent = target.getAttribute('data-ff-tooltip');
            tooltip.style.display = 'block';
        }
    });

    document.addEventListener('mousemove', (e) => {
        tooltip.style.left = (e.clientX + 12) + 'px';
        tooltip.style.top = (e.clientY + 12) + 'px';
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.closest('[data-ff-tooltip]')) {
            tooltip.style.display = 'none';
        }
    });
}

// SYNONYM_MAP and CROSS_REACTIVITY_MAP loading
const DEFAULT_ALLERGEN_LIST = [
    'peanut',
    'milk', 'dairy',
    'egg',
    'soy', 'soya', 'soybean',
    'wheat', 'gluten',
    'fish',
    'shellfish', 'crustacean', 'shrimp', 'crab', 'lobster',
    'tree nut', 'almond', 'cashew', 'walnut', 'pecan', 'hazelnut',
    'sesame', 'mustard', 'celery', 'lupin',
    'sulphite', 'sulfite'
];

let ALLERGEN_LIST = [];
let EXPANDED_ALLERGEN_LIST = [];
let CROSS_REACTIVE_LIST = [];
let bannerDismissed = false;
let hasScanned = false;

// Bidirectional relationships
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

// Expands list with synonyms
function buildExpandedAllergenList() {
    const synonymMapBi = makeBidirectional(SYNONYM_MAP);
    const expanded = new Set(ALLERGEN_LIST.map(a => a.toLowerCase()));
    ALLERGEN_LIST.forEach(allergen => {
        const synonyms = synonymMapBi[allergen.toLowerCase()];
        if (synonyms) synonyms.forEach(s => expanded.add(s.toLowerCase()));
    });
    EXPANDED_ALLERGEN_LIST = Array.from(expanded);
}

// Expands list with cross reactivity
function buildCrossReactiveList() {
    const crossMapBi = makeBidirectional(CROSS_REACTIVITY_MAP);
    const crossSet = new Set();
    EXPANDED_ALLERGEN_LIST.forEach(allergen => {
        const related = crossMapBi[allergen];
        if (related) {
            related.forEach(item => {
                if (!EXPANDED_ALLERGEN_LIST.includes(item.toLowerCase())) {
                    crossSet.add(item.toLowerCase());
                }
            });
        }
    });
    CROSS_REACTIVE_LIST = Array.from(crossSet);
}

// Load allergens from storage to scan
function loadAllergenList() {
    chrome.storage.sync.get(['userAllergens'], (result) => {
        ALLERGEN_LIST = (result.userAllergens && result.userAllergens.length > 0)
            ? result.userAllergens
            : DEFAULT_ALLERGEN_LIST;
        buildExpandedAllergenList();
        buildCrossReactiveList();
        hasScanned = false;
        scanPage();
    });
}

// Exclusion patterns
const EXCLUSION_PATTERNS = [
    'gluten free', 'gluten-free', 'dairy free', 'dairy-free',
    'egg free', 'egg-free', 'nut free', 'nut-free',
    'soy free', 'soy-free', 'milk free', 'milk-free',
    'wheat free', 'wheat-free', 'peanut free', 'peanut-free',
    'fish free', 'fish-free', 'shellfish free', 'shellfish-free',
    'no gluten', 'no dairy', 'no eggs', 'no nuts', 'no soy', 'no milk', 'no wheat',
    'without gluten', 'without dairy', 'without eggs', 'without nuts', 'without soy'
];

function isExcludedContext(text, position, allergen) {
    const start = Math.max(0, position - 50);
    const end = Math.min(text.length, position + allergen.length + 50);
    const context = text.substring(start, end).toLowerCase();
    for (const pattern of EXCLUSION_PATTERNS) {
        if (context.includes(pattern)) {
            const patternIndex = context.indexOf(pattern);
            const allergenRelativePos = position - start;
            if (Math.abs(patternIndex - allergenRelativePos) < pattern.length + 10) return true;
        }
    }
    return false;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Processes a single text node and wraps matched allergens in spans
function processTextNode(textNode) {
    const text = textNode.textContent;
    if (!text.trim()) return;

    const matches = [];

    EXPANDED_ALLERGEN_LIST.forEach(allergen => {
        const regex = new RegExp(`\\b${escapeRegex(allergen)}\\b`, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
            if (!isExcludedContext(text, match.index, allergen)) {
                matches.push({
                    allergen: allergen,
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0],
                    type: 'direct'
                });
            }
        }
    });

    CROSS_REACTIVE_LIST.forEach(ingredient => {
        const regex = new RegExp(`\\b${escapeRegex(ingredient)}\\b`, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
            if (!isExcludedContext(text, match.index, ingredient)) {
                matches.push({
                    allergen: ingredient,
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0],
                    type: 'cross-reactive'
                });
            }
        }
    });

    if (matches.length === 0) return;

    // Sorts and deduplicates overlapping matches
    matches.sort((a, b) => a.start - b.start);
    const unique = [];
    for (const match of matches) {
        const overlaps = unique.some(e =>
            (match.start >= e.start && match.start < e.end) ||
            (match.end > e.start && match.end <= e.end) ||
            (match.start <= e.start && match.end >= e.end)
        );
        if (!overlaps) unique.push(match);
    }

    // Replaces text node with highlighted spans
    unique.sort((a, b) => b.start - a.start);
    const fragment = document.createDocumentFragment();
    let lastEnd = text.length;

    unique.forEach(match => {
        if (lastEnd > match.end) {
            fragment.insertBefore(
                document.createTextNode(text.substring(match.end, lastEnd)),
                fragment.firstChild
            );
        }

        const span = document.createElement('span');
        const isCross = match.type === 'cross-reactive';
        span.className = isCross ? 'cross-reactive-highlight' : 'allergen-highlight';
        span.setAttribute('data-allergen', match.allergen);

        if (isCross) {
            const crossMapBi = makeBidirectional(CROSS_REACTIVITY_MAP);
            const trigger = EXPANDED_ALLERGEN_LIST.find(a => {
                const related = crossMapBi[a.toLowerCase()];
                return related && related.includes(match.allergen.toLowerCase());
            });
            const tooltipText = `Potential cross reactive: ${match.text} , may affect people allergic to ${trigger || 'a related allergen'}`;
            span.style.cssText = 'background-color: rgba(255, 200, 0, 0.45); color: black; padding: 2px 4px; border-radius: 3px; font-weight: bold; cursor: help; position: relative; display: inline;';
            span.setAttribute('data-ff-tooltip', tooltipText);
        } else {
            const tooltipText = `Allergen detected: ${match.text}`;
            span.style.cssText = 'background-color: rgba(255, 68, 68, 0.35); color: black; padding: 2px 4px; border-radius: 3px; font-weight: bold; cursor: help; position: relative; display: inline; pointer-events: auto;';
            span.setAttribute('data-ff-tooltip', tooltipText);
        }

        span.textContent = match.text;
        fragment.insertBefore(span, fragment.firstChild);
        lastEnd = match.start;
    });

    if (lastEnd > 0) {
        fragment.insertBefore(
            document.createTextNode(text.substring(0, lastEnd)),
            fragment.firstChild
        );
    }

    textNode.parentNode.replaceChild(fragment, textNode);
}

// Scan for single element
function scanElement(element) {
    // Skips already scanned or highlight spans
    if (element.hasAttribute('data-ff-scanned')) return;
    if (element.classList.contains('allergen-highlight')) return;
    if (element.classList.contains('cross-reactive-highlight')) return;

    element.setAttribute('data-ff-scanned', '1');

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const p = node.parentElement;
            if (p.classList.contains('allergen-highlight') || p.classList.contains('cross-reactive-highlight')) {
                return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
        }
    });

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) textNodes.push(node);
    textNodes.forEach(processTextNode);
}

// Main page scan
function scanPage() {
    if (hasScanned) return;
    hasScanned = true;

    const selectors = [
        '[data-feature-name="ingredients"]',
        '#ingredients_feature_div',
        '#productDetails_feature_div',
        '#detailBullets_feature_div',
        '#important-information',
        '.product-facts-detail',
        '#feature-bullets',
        '#productDescription',
        '[class*="ingredient"]',
        '[id*="ingredient"]'
    ];

    selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            if (el.textContent.trim().length > 0) scanElement(el);
        });
    });

    // Counts what was found and displays the banner
    const foundAllergens = new Set();
    const foundCross = new Set();
    document.querySelectorAll('.allergen-highlight').forEach(el => foundAllergens.add(el.getAttribute('data-allergen')));
    document.querySelectorAll('.cross-reactive-highlight').forEach(el => foundCross.add(el.getAttribute('data-allergen')));

    if (foundAllergens.size > 0 || foundCross.size > 0) {
        showBanner(Array.from(foundAllergens), Array.from(foundCross));
    }
}

// Warning banner
function showBanner(allergens, cross) {
    if (bannerDismissed || document.getElementById('ff-banner')) return;

    let html = '';
    if (allergens.length > 0) {
        const shown = allergens.slice(0, 4);
        const extra = allergens.length - shown.length;
        html += `<strong>Allergens detected:</strong> ${shown.join(', ')}${extra > 0 ? ` and ${extra} more` : ''}`;
    }
    if (cross.length > 0) {
        const shown = cross.slice(0, 3);
        const extra = cross.length - shown.length;
        if (allergens.length > 0) html += '&nbsp;&nbsp;|&nbsp;&nbsp;';
        html += `<strong>Potential cross reactive:</strong> ${shown.join(', ')}${extra > 0 ? ` and ${extra} more` : ''}`;
    }

    const banner = document.createElement('div');
    banner.id = 'ff-banner';
    banner.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0;
        background: ${allergens.length > 0 ? '#ff4444' : '#e6a800'};
        color: white; padding: 12px 20px; text-align: center;
        font-weight: bold; font-size: 15px; z-index: 999999;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    banner.innerHTML = `${html}
        <button id="ff-dismiss" style="margin-left:20px; background:white;
            color:${allergens.length > 0 ? '#ff4444' : '#e6a800'};
            border:none; padding:5px 15px; border-radius:3px;
            cursor:pointer; font-weight:bold;">Dismiss</button>`;

    document.body.insertBefore(banner, document.body.firstChild);
    document.getElementById('ff-dismiss').addEventListener('click', () => {
        bannerDismissed = true;
        banner.remove();
    });
}


function init() {
    injectTooltipStyles();
    loadAllergenList();

    // Watches for dynamically loaded content (Amazon loads lazily)
    if (document.body) {
        const observer = new MutationObserver(() => {
            if (!hasScanned) return;
            clearTimeout(window._ffTimeout);
            window._ffTimeout = setTimeout(() => {
                hasScanned = false;
                scanPage();
            }, 800);
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Listen for popup reload message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'reloadAllergens') {
        bannerDismissed = false;
        hasScanned = false;
        const banner = document.getElementById('ff-banner');
        if (banner) banner.remove();
        document.querySelectorAll('[data-ff-scanned]').forEach(el => el.removeAttribute('data-ff-scanned'));
        loadAllergenList();
        sendResponse({ success: true });
    }
});

console.log('FoodFlag loaded');
