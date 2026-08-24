// ═══════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════
const GITHUB_OWNER = 'Qu4rk';
const GITHUB_REPO = 'chronotomi-wealth';
const GITHUB_BRANCH = 'master';
const GITHUB_API = 'https://api.github.com';
const CATALOG_PATH = 'watches.json';

// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
let currentWatches = [];
let originalWatchesJSON = '';
let pendingImages = new Map();
let editingIndex = -1;

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'watch';
}

function normalizeImage(image) {
    return {
        src: String(image?.src || '').trim(),
        alt: String(image?.alt || '').trim(),
        width: Number(image?.width),
        height: Number(image?.height)
    };
}

function watchImages(watch) {
    if (!Array.isArray(watch.images)) return [];
    return watch.images.filter(image => image && typeof image === 'object').map(normalizeImage);
}

function normalizeWatch(record) {
    const images = watchImages(record);
    const watch = {
        id: String(record.id || '').trim(),
        slug: String(record.slug || '').trim(),
        brand: String(record.brand || '').trim(),
        brandSlug: String(record.brandSlug || '').trim(),
        model: String(record.model || '').trim(),
        reference: String(record.reference || '').trim(),
        caseSize: String(record.caseSize || '').trim(),
        set: String(record.set || '').trim(),
        summary: String(record.summary || '').trim(),
        images,
        dateModified: String(record.dateModified || '').trim(),
        indexable: record.indexable !== false
    };
    const year = String(record.year || '').trim();
    const condition = String(record.condition || '').trim();
    if (year) watch.year = year;
    if (condition) watch.condition = condition;
    return watch;
}

function normalizeCatalog(data) {
    if (!Array.isArray(data)) throw new Error('Catalog must be an array.');
    const usedIds = new Set();
    const usedSlugs = new Set();
    return data.map((record, index) => {
        const watch = normalizeWatch(record);
        if (!watch.id || !watch.slug) throw new Error(`Catalog record ${index + 1} is missing an id or slug.`);
        if (usedIds.has(watch.id)) throw new Error(`Duplicate watch id: ${watch.id}`);
        if (usedSlugs.has(watch.slug)) throw new Error(`Duplicate watch slug: ${watch.slug}`);
        usedIds.add(watch.id);
        usedSlugs.add(watch.slug);
        return watch;
    });
}

function createIdentity(watch) {
    const baseSlug = slugify([watch.brand, watch.model, watch.reference].filter(Boolean).join('-'));
    const usedIds = new Set(currentWatches.map(item => item.id));
    const usedSlugs = new Set(currentWatches.map(item => item.slug));
    let slug = baseSlug;
    let suffix = 1;
    while (usedSlugs.has(slug) || usedIds.has(`watch-${slug}`)) slug = `${baseSlug}-${++suffix}`;
    return { id: `watch-${slug}`, slug };
}

function isoDate(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

function imageAlt(watch, index = 0) {
    const primaryAlt = `${watch.brand} ${watch.model}, reference ${watch.reference}`;
    if (index === 0) return primaryAlt;
    return `${primaryAlt} alternate view${index === 1 ? '' : ` ${index}`}`;
}

function validImageMetadata(image) {
    return Boolean(
        image &&
        typeof image.src === 'string' && image.src.trim() &&
        typeof image.alt === 'string' && image.alt.trim() &&
        Number.isInteger(image.width) && image.width > 0 &&
        Number.isInteger(image.height) && image.height > 0
    );
}

function validateWatch(watch) {
    if (watch.indexable && !watch.summary) return 'Indexable watches require a summary.';
    if (!watch.images.length) return 'Every watch requires at least one image.';
    if (!watch.images.every(validImageMetadata)) {
        return 'Every image requires a source, alt text, width, and height.';
    }
    return '';
}

function imagesForSave(existingWatch, pendingImage, draft) {
    const existingImages = existingWatch ? watchImages(existingWatch) : [];
    const images = pendingImage
        ? [normalizeImage(pendingImage.image), ...existingImages.slice(1)]
        : existingImages;
    return images.map((image, index) => normalizeImage({
        ...image,
        alt: imageAlt(draft, index)
    }));
}

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
async function init() {
    const sources = [
        `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${CATALOG_PATH}?t=${Date.now()}`,
        `${CATALOG_PATH}?t=${Date.now()}`
    ];
    let loadError = null;

    for (const source of sources) {
        try {
            const res = await fetch(source);
            if (!res.ok) continue;
            const data = await res.json();
            currentWatches = normalizeCatalog(data);
            originalWatchesJSON = JSON.stringify(currentWatches);
            loadError = null;
            break;
        } catch (e) {
            loadError = e;
        }
    }

    renderWatchGrid();
    updatePublishState();
    if (loadError && currentWatches.length === 0) {
        showToast(`Catalog could not be loaded: ${loadError.message}`, 'error');
    }
}

// ═══════════════════════════════════════
// AUTH
// ═══════════════════════════════════════
function checkPassword() {
    const pass = document.getElementById('admin-pass').value;
    if (btoa(pass) === 'd2F0Y2hlczIwMjY=') {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
    } else {
        const err = document.getElementById('login-error');
        err.style.display = 'block';
        document.getElementById('admin-pass').value = '';
        setTimeout(() => err.style.display = 'none', 3000);
    }
}

function getToken() {
    return localStorage.getItem('chronotomi_gh_token') || '';
}

function saveToken() {
    const token = document.getElementById('settings-token').value.trim();
    if (token) {
        localStorage.setItem('chronotomi_gh_token', token);
        closeAllModals();
        showToast('Token saved successfully', 'success');
    } else {
        showToast('Please enter a valid token', 'error');
    }
}

function openSettings() {
    const token = getToken();
    const input = document.getElementById('settings-token');
    if (token) {
        input.value = '';
        input.placeholder = 'Token saved (••••••) — paste a new one to replace';
    } else {
        input.value = '';
        input.placeholder = 'Paste your token here';
    }
    openModal('settings-modal');
}

// ═══════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ═══════════════════════════════════════
// MODAL MANAGEMENT
// ═══════════════════════════════════════
function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    document.body.style.overflow = '';
}

// ═══════════════════════════════════════
// RENDER WATCH GRID
// ═══════════════════════════════════════
function renderWatchGrid() {
    const grid = document.getElementById('watch-grid');
    const count = document.getElementById('watch-count');
    count.textContent = `${currentWatches.length} watch${currentWatches.length !== 1 ? 'es' : ''}`;

    let html = `
        <div class="watch-card add-card" onclick="openAddModal()">
            <div class="add-card-inner">
                <span class="add-icon">+</span>
                <span>Add New Watch</span>
            </div>
        </div>
    `;

    currentWatches.forEach((w, i) => {
        const primaryImage = watchImages(w)[0];
        const pendingImage = pendingImages.get(i);
        const imgSrc = pendingImage?.previewUrl || primaryImage?.src || 'assets/logo_transparent.png';
        const imgAlt = primaryImage?.alt || `${w.brand} ${w.model}`;
        html += `
            <div class="watch-card">
                <div class="card-image">
                    <img src="${imgSrc}" alt="${imgAlt}" onerror="this.src='assets/logo_transparent.png'">
                </div>
                <div class="card-body">
                    <div class="card-brand">${w.brand}</div>
                    <div class="card-model">${w.model}</div>
                    <div class="card-ref">Ref. ${w.reference}</div>
                    <div class="card-actions">
                        <button class="btn-edit" onclick="openEditModal(${i})">✎ Edit</button>
                        <button class="btn-remove" onclick="confirmDelete(${i})">✕ Remove</button>
                    </div>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
    updatePublishState();
}

// ═══════════════════════════════════════
// WATCH CRUD
// ═══════════════════════════════════════
function openAddModal() {
    editingIndex = -1;
    document.getElementById('modal-title').textContent = 'Add New Watch';
    document.getElementById('watchForm').reset();
    document.getElementById('image-preview').innerHTML = '<span class="preview-placeholder">No image selected</span>';
    document.getElementById('wSummary').value = '';
    document.getElementById('wIndexable').checked = true;
    openModal('watch-modal');
}

function openEditModal(index) {
    editingIndex = index;
    const w = currentWatches[index];
    document.getElementById('modal-title').textContent = 'Edit Watch';
    document.getElementById('wBrand').value = w.brand;
    document.getElementById('wModel').value = w.model;
    document.getElementById('wReference').value = w.reference;
    document.getElementById('wYear').value = w.year || '';
    document.getElementById('wCondition').value = w.condition || '';
    document.getElementById('wSet').value = w.set;
    document.getElementById('wCaseSize').value = w.caseSize;
    document.getElementById('wSummary').value = w.summary || '';
    document.getElementById('wIndexable').checked = w.indexable !== false;

    const primaryImage = watchImages(w)[0];
    const pendingImage = pendingImages.get(index);
    const imgSrc = pendingImage?.previewUrl || primaryImage?.src;
    document.getElementById('image-preview').innerHTML = imgSrc
        ? `<img src="${imgSrc}" alt="${primaryImage?.alt || 'Watch image preview'}" onerror="this.parentElement.innerHTML='<span class=\\'preview-placeholder\\'>Image not found</span>'">`
        : '<span class="preview-placeholder">No image selected</span>';

    openModal('watch-modal');
}

function handleImageSelect(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewUrl = e.target.result;
        const probe = new Image();
        probe.onload = function() {
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
            const safeName = `watch_${Date.now()}.${ext}`;
            const tempIndex = editingIndex >= 0 ? editingIndex : currentWatches.length;
            pendingImages.set(tempIndex, {
                file,
                previewUrl,
                filename: safeName,
                image: {
                    src: `assets/${safeName}`,
                    width: probe.naturalWidth,
                    height: probe.naturalHeight
                }
            });
            document.getElementById('image-preview').innerHTML = `<img src="${previewUrl}" alt="Selected watch image preview">`;
        };
        probe.onerror = function() {
            showToast('The selected image could not be read.', 'error');
            input.value = '';
        };
        probe.src = previewUrl;
    };
    reader.onerror = function() {
        showToast('The selected image could not be read.', 'error');
        input.value = '';
    };
    reader.readAsDataURL(file);
}

function saveWatch(e) {
    e.preventDefault();
    const existingWatch = editingIndex >= 0 ? currentWatches[editingIndex] : null;
    const pendingIndex = editingIndex >= 0 ? editingIndex : currentWatches.length;
    const pendingImage = pendingImages.get(pendingIndex);
    const year = document.getElementById('wYear').value.trim();
    const condition = document.getElementById('wCondition').value.trim();
    const brand = document.getElementById('wBrand').value.trim();
    const model = document.getElementById('wModel').value.trim();
    const reference = document.getElementById('wReference').value.trim();
    const identity = existingWatch ? { id: existingWatch.id, slug: existingWatch.slug } : createIdentity({ brand, model, reference });
    const draft = { brand, model, reference };
    const watch = {
        id: identity.id,
        slug: identity.slug,
        brand,
        brandSlug: slugify(brand),
        model,
        reference,
        caseSize: document.getElementById('wCaseSize').value.trim(),
        set: document.getElementById('wSet').value.trim(),
        summary: document.getElementById('wSummary').value.trim(),
        images: imagesForSave(existingWatch, pendingImage, draft),
        dateModified: isoDate(),
        indexable: document.getElementById('wIndexable').checked
    };
    if (year) watch.year = year;
    if (condition) watch.condition = condition;

    const validationError = validateWatch(watch);
    if (validationError) {
        showToast(validationError, 'error');
        return false;
    }

    if (editingIndex >= 0) {
        currentWatches[editingIndex] = watch;
        showToast(`${watch.brand} ${watch.model} updated`, 'success');
    } else {
        // The image was stored at the index that was currentWatches.length
        // (before this push). After push, the new watch sits at length-1.
        const preAddIndex = currentWatches.length;
        currentWatches.push(watch);
        const newIndex = currentWatches.length - 1;
        if (pendingImages.has(preAddIndex) && preAddIndex !== newIndex) {
            pendingImages.set(newIndex, pendingImages.get(preAddIndex));
            pendingImages.delete(preAddIndex);
        }
        showToast(`${watch.brand} ${watch.model} added`, 'success');
    }

    closeAllModals();
    renderWatchGrid();
    return true;
}

function confirmDelete(index) {
    const w = currentWatches[index];
    document.getElementById('delete-watch-name').textContent = `${w.brand} ${w.model}`;
    document.getElementById('delete-confirm-btn').onclick = () => {
        currentWatches.splice(index, 1);
        // Re-index pending images
        const newPending = new Map();
        pendingImages.forEach((val, key) => {
            if (key < index) newPending.set(key, val);
            else if (key > index) newPending.set(key - 1, val);
        });
        pendingImages = newPending;
        closeAllModals();
        renderWatchGrid();
        showToast('Watch removed', 'info');
    };
    openModal('delete-modal');
}

// ═══════════════════════════════════════
// PUBLISH STATE
// ═══════════════════════════════════════
function hasChanges() {
    return JSON.stringify(currentWatches) !== originalWatchesJSON || pendingImages.size > 0;
}

function updatePublishState() {
    const banner = document.getElementById('changes-banner');
    const publishBtn = document.getElementById('publish-btn');
    if (hasChanges()) {
        banner.classList.add('visible');
        publishBtn.classList.add('has-changes');
    } else {
        banner.classList.remove('visible');
        publishBtn.classList.remove('has-changes');
    }
}

// ═══════════════════════════════════════
// PUBLISH TO GITHUB
// ═══════════════════════════════════════
async function startPublish() {
    const token = getToken();
    if (!token) {
        showToast('Please set up your GitHub token first (click the ⚙ icon)', 'error');
        openSettings();
        return;
    }
    openModal('publish-modal');
    document.getElementById('publish-status').textContent = 'Ready to publish';
    document.getElementById('publish-progress').style.display = 'none';
    document.getElementById('publish-actions').style.display = 'flex';
    document.getElementById('publish-done-actions').style.display = 'none';
}

async function executePublish() {
    const token = getToken();
    const status = document.getElementById('publish-status');
    const progress = document.getElementById('publish-progress');
    const actions = document.getElementById('publish-actions');
    const doneActions = document.getElementById('publish-done-actions');

    actions.style.display = 'none';
    progress.style.display = 'block';

    try {
        // Step 1: Upload any new images
        if (pendingImages.size > 0) {
            let imgCount = 0;
            for (const [index, imgData] of pendingImages) {
                imgCount++;
                status.textContent = `Uploading image ${imgCount} of ${pendingImages.size}...`;
                const base64Content = await fileToBase64(imgData.file);
                await githubCreateFile(
                    token,
                    `assets/${imgData.filename}`,
                    base64Content,
                    `Add watch image: ${imgData.filename}`
                );
            }
        }

        // Publish the single canonical catalog file.
        status.textContent = 'Updating inventory file...';
        const jsonContent = JSON.stringify(currentWatches, null, 2);
        const jsonBase64 = utf8ToBase64(jsonContent);
        try {
            const jsonFile = await githubGetFile(token, CATALOG_PATH);
            await githubUpdateFile(token, CATALOG_PATH, jsonBase64, jsonFile.sha, 'Update watch inventory data');
        } catch (e) {
            // File might not exist yet, create it
            await githubCreateFile(token, CATALOG_PATH, jsonBase64, 'Create watch inventory data');
        }

        // Success
        status.textContent = '✓ Published successfully! Changes will appear on the website within a minute.';
        progress.style.display = 'none';
        doneActions.style.display = 'flex';
        originalWatchesJSON = JSON.stringify(currentWatches);
        pendingImages.clear();
        updatePublishState();
        showToast('Changes published to website!', 'success');

    } catch (err) {
        console.error('Publish error:', err);
        status.textContent = `Error: ${err.message || 'Something went wrong. Please try again.'}`;
        progress.style.display = 'none';
        doneActions.style.display = 'flex';
        showToast('Publishing failed — see details in the dialog', 'error');
    }
}

// ═══════════════════════════════════════
// GITHUB API HELPERS
// ═══════════════════════════════════════
async function githubGetFile(token, path) {
    const res = await fetch(`${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`, {
        headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Invalid GitHub token. Please update it in Settings.');
        throw new Error(`Failed to read ${path} (${res.status})`);
    }
    return res.json();
}

async function githubUpdateFile(token, path, contentBase64, sha, message) {
    const res = await fetch(`${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, content: contentBase64, sha, branch: GITHUB_BRANCH })
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Failed to update ${path}`);
    }
    return res.json();
}

async function githubCreateFile(token, path, contentBase64, message) {
    // Check if file exists first
    let sha = null;
    try {
        const existing = await githubGetFile(token, path);
        sha = existing.sha;
    } catch (e) { /* file doesn't exist, that's fine */ }

    const body = { message, content: contentBase64, branch: GITHUB_BRANCH };
    if (sha) body.sha = sha;

    const res = await fetch(`${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Failed to upload ${path}`);
    return res.json();
}

// ═══════════════════════════════════════
// FILE HELPERS
// ═══════════════════════════════════════
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
}

// ═══════════════════════════════════════
// UNSAVED CHANGES WARNING
// ═══════════════════════════════════════
window.addEventListener('beforeunload', function(e) {
    if (hasChanges()) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// ═══════════════════════════════════════
// INIT ON LOAD
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', init);
