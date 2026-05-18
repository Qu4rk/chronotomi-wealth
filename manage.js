// ═══════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════
const GITHUB_OWNER = 'Qu4rk';
const GITHUB_REPO = 'chronotomi-wealth';
const GITHUB_BRANCH = 'main';
const GITHUB_API = 'https://api.github.com';

// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
let currentWatches = [];
let originalWatchesJSON = '';
let pendingImages = new Map();
let editingIndex = -1;

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
function init() {
    if (typeof watches !== 'undefined') {
        currentWatches = JSON.parse(JSON.stringify(watches));
        originalWatchesJSON = JSON.stringify(watches);
    }
    renderWatchGrid();
    updatePublishState();
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
    document.getElementById('settings-token').value = getToken();
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
        const imgSrc = pendingImages.has(i) ? pendingImages.get(i).previewUrl : w.image;
        const statusClass = w.status === 'In Stock' ? 'status-instock' : w.status === 'Reserved' ? 'status-reserved' : 'status-sold';
        html += `
            <div class="watch-card">
                <div class="card-image">
                    <img src="${imgSrc}" alt="${w.brand} ${w.model}" onerror="this.src='assets/logo_transparent.png'">
                </div>
                <div class="card-body">
                    <div class="card-brand">${w.brand}</div>
                    <div class="card-model">${w.model}</div>
                    <div class="card-ref">Ref. ${w.reference}</div>
                    <div class="card-status-row">
                        <select class="status-select ${statusClass}" onchange="quickStatusChange(${i}, this.value)">
                            <option value="In Stock" ${w.status === 'In Stock' ? 'selected' : ''}>In Stock</option>
                            <option value="Reserved" ${w.status === 'Reserved' ? 'selected' : ''}>Reserved</option>
                            <option value="Sold" ${w.status === 'Sold' ? 'selected' : ''}>Sold</option>
                        </select>
                    </div>
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

function quickStatusChange(index, newStatus) {
    currentWatches[index].status = newStatus;
    renderWatchGrid();
    showToast(`Status changed to "${newStatus}"`, 'info');
}

// ═══════════════════════════════════════
// WATCH CRUD
// ═══════════════════════════════════════
function openAddModal() {
    editingIndex = -1;
    document.getElementById('modal-title').textContent = 'Add New Watch';
    document.getElementById('watchForm').reset();
    document.getElementById('image-preview').innerHTML = '<span class="preview-placeholder">No image selected</span>';
    document.getElementById('wImagePath').value = '';
    openModal('watch-modal');
}

function openEditModal(index) {
    editingIndex = index;
    const w = currentWatches[index];
    document.getElementById('modal-title').textContent = 'Edit Watch';
    document.getElementById('wBrand').value = w.brand;
    document.getElementById('wModel').value = w.model;
    document.getElementById('wReference').value = w.reference;
    document.getElementById('wYear').value = w.year;
    document.getElementById('wCondition').value = w.condition;
    document.getElementById('wSet').value = w.set;
    document.getElementById('wCaseSize').value = w.caseSize;
    document.getElementById('wStatus').value = w.status;
    document.getElementById('wImagePath').value = w.image;

    const imgSrc = pendingImages.has(index) ? pendingImages.get(index).previewUrl : w.image;
    document.getElementById('image-preview').innerHTML = `<img src="${imgSrc}" alt="Preview" onerror="this.parentElement.innerHTML='<span class=\\'preview-placeholder\\'>Image not found</span>'">`;

    openModal('watch-modal');
}

function handleImageSelect(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('image-preview').innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        const ext = file.name.split('.').pop();
        const safeName = `watch_${Date.now()}.${ext}`;
        document.getElementById('wImagePath').value = `assets/${safeName}`;
        // Store file for later upload
        const tempIndex = editingIndex >= 0 ? editingIndex : currentWatches.length;
        pendingImages.set(tempIndex, { file: file, previewUrl: e.target.result, filename: safeName });
    };
    reader.readAsDataURL(file);
}

function saveWatch(e) {
    e.preventDefault();
    const watch = {
        brand: document.getElementById('wBrand').value.trim(),
        model: document.getElementById('wModel').value.trim(),
        reference: document.getElementById('wReference').value.trim(),
        year: document.getElementById('wYear').value.trim(),
        condition: document.getElementById('wCondition').value.trim(),
        set: document.getElementById('wSet').value.trim(),
        caseSize: document.getElementById('wCaseSize').value.trim(),
        status: document.getElementById('wStatus').value,
        image: document.getElementById('wImagePath').value.trim() || 'assets/logo_transparent.png'
    };

    if (editingIndex >= 0) {
        currentWatches[editingIndex] = watch;
        showToast(`${watch.brand} ${watch.model} updated`, 'success');
    } else {
        currentWatches.push(watch);
        // Move pending image to correct index
        const tempIndex = currentWatches.length; // old length before push was length-1... 
        if (pendingImages.has(currentWatches.length - 1) === false && pendingImages.has(tempIndex)) {
            pendingImages.set(currentWatches.length - 1, pendingImages.get(tempIndex));
            pendingImages.delete(tempIndex);
        }
        showToast(`${watch.brand} ${watch.model} added`, 'success');
    }

    closeAllModals();
    renderWatchGrid();
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

        // Step 2: Update watches.js
        status.textContent = 'Updating inventory file...';
        const watchesContent = generateWatchesFileContent();
        const base64 = utf8ToBase64(watchesContent);

        // Get current SHA
        const fileData = await githubGetFile(token, 'watches.js');
        await githubUpdateFile(token, 'watches.js', base64, fileData.sha, 'Update watch inventory');

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

function generateWatchesFileContent() {
    return `// ==========================================
// CHRONOTOMI WEALTH - WATCH COLLECTION
// ==========================================
// Managed via the Chronotomi admin panel.
// Do not edit this file manually.
// ==========================================

const watches = ${JSON.stringify(currentWatches, null, 2)};
`;
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
