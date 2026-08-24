import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../manage.js", import.meta.url), "utf8");
const managerHtml = fs.readFileSync(new URL("../manage.html", import.meta.url), "utf8");
const actualCatalog = JSON.parse(fs.readFileSync(new URL("../watches.json", import.meta.url), "utf8"));

function classList() {
  return { add() {}, remove() {} };
}

const elements = {
  "watch-grid": { innerHTML: "" },
  "watch-count": { textContent: "" },
  "changes-banner": { classList: classList() },
  "publish-btn": { classList: classList() },
  wBrand: { value: "" },
  wModel: { value: "" },
  wReference: { value: "" },
  wYear: { value: "" },
  wCondition: { value: "" },
  wSet: { value: "" },
  wCaseSize: { value: "" },
  wSummary: { value: "" },
  wIndexable: { checked: true },
};

const context = {
  console,
  TextEncoder,
  btoa: () => "",
  fetch: async () => ({ ok: false }),
  localStorage: { getItem: () => "", setItem() {} },
  requestAnimationFrame(callback) { callback(); },
  setTimeout() {},
  document: {
    body: { style: {} },
    addEventListener() {},
    getElementById(id) { return elements[id]; },
    querySelectorAll() { return []; },
  },
  window: { addEventListener() {} },
};

vm.createContext(context);
vm.runInContext(source, context, { filename: "manage.js" });
vm.runInContext("showToast = function(message) { globalThis.lastToast = message; }; closeAllModals = function() {};", context);

function evaluate(expression) {
  return vm.runInContext(expression, context);
}

function jsonValue(expression) {
  return JSON.parse(evaluate(`JSON.stringify(${expression})`));
}

function setFields(values = {}) {
  Object.assign(elements.wBrand, { value: values.brand ?? "Rolex" });
  Object.assign(elements.wModel, { value: values.model ?? "GMT-Master II" });
  Object.assign(elements.wReference, { value: values.reference ?? "126710GRNR" });
  Object.assign(elements.wYear, { value: values.year ?? "" });
  Object.assign(elements.wCondition, { value: values.condition ?? "" });
  Object.assign(elements.wSet, { value: values.set ?? "Full Set" });
  Object.assign(elements.wCaseSize, { value: values.caseSize ?? "40mm" });
  Object.assign(elements.wSummary, { value: values.summary ?? "A verified editorial summary." });
  Object.assign(elements.wIndexable, { checked: values.indexable ?? true });
}

const images = [
  { src: "assets/primary.png", alt: "Rolex GMT-Master II, reference 126710GRNR", width: 832, height: 1248 },
  { src: "assets/alternate.png", alt: "Rolex GMT-Master II alternate view", width: 1024, height: 1024 },
];
const record = {
  id: "rolex-gmt-master-ii-126710grnr",
  slug: "gmt-master-ii-126710grnr",
  brand: "Rolex",
  brandSlug: "rolex",
  model: "GMT-Master II",
  reference: "126710GRNR",
  caseSize: "40mm",
  set: "Full Set",
  summary: "A verified editorial summary.",
  images,
  dateModified: "2026-08-23",
  indexable: true,
  status: "In Stock",
  image: "assets/legacy.png",
};

context.__record = record;
const normalized = jsonValue("normalizeWatch(__record)");
assert.deepEqual(Object.keys(normalized).sort(), [
  "brand", "brandSlug", "caseSize", "dateModified", "id", "images", "indexable",
  "model", "reference", "set", "slug", "summary",
].sort());
assert.deepEqual(normalized.images, images);
assert.equal(normalized.id, record.id);
assert.equal(normalized.slug, record.slug);
assert.equal(normalized.status, undefined);
assert.equal(normalized.image, undefined);

context.__actualCatalog = actualCatalog;
const normalizedActualCatalog = jsonValue("normalizeCatalog(__actualCatalog)");
assert.equal(normalizedActualCatalog.length, actualCatalog.length);
for (const watch of normalizedActualCatalog) {
  assert.equal("status" in watch, false);
  assert.equal("image" in watch, false);
  assert.equal(jsonValue(`validateWatch(${JSON.stringify(watch)})`), "");
  assert.ok(watch.images.every((image) => image.src && image.alt && image.width > 0 && image.height > 0));
}

context.__duplicates = [record, { ...record, slug: "different-slug" }];
assert.throws(() => evaluate("normalizeCatalog(__duplicates)"), /Duplicate watch id/);
context.__duplicates = [record, { ...record, id: "different-id" }];
assert.throws(() => evaluate("normalizeCatalog(__duplicates)"), /Duplicate watch slug/);

context.__catalog = [record];
evaluate("currentWatches = normalizeCatalog(__catalog); originalWatchesJSON = JSON.stringify(currentWatches); pendingImages = new Map(); renderWatchGrid();");
assert.match(elements["watch-grid"].innerHTML, /src="assets\/primary\.png"/);
assert.doesNotMatch(elements["watch-grid"].innerHTML, /\[object Object\]/);
assert.doesNotMatch(elements["watch-grid"].innerHTML, /In Stock|Reserved|Sold|quickStatusChange/);

setFields({ brand: "Cartier", model: "Santos de Cartier", reference: "WSSA0071" });
assert.equal(evaluate("editingIndex = 0; saveWatch({ preventDefault: function() {} })"), true);
let saved = jsonValue("currentWatches[0]");
assert.equal(saved.id, record.id);
assert.equal(saved.slug, record.slug);
assert.equal(saved.brandSlug, "cartier");
assert.deepEqual(saved.images, [
  { ...images[0], alt: "Cartier Santos de Cartier, reference WSSA0071" },
  { ...images[1], alt: "Cartier Santos de Cartier, reference WSSA0071 alternate view" },
]);
assert.equal(saved.dateModified, new Date().toISOString().slice(0, 10));
assert.equal("year" in saved, false);
assert.equal("condition" in saved, false);
assert.deepEqual(Object.keys(saved).sort(), [
  "brand", "brandSlug", "caseSize", "dateModified", "id", "images", "indexable",
  "model", "reference", "set", "slug", "summary",
].sort());

context.__pending = {
  file: { name: "replacement.png" },
  filename: "replacement.png",
  previewUrl: "data:image/png;base64,replacement",
  image: { src: "assets/replacement.png", width: 1600, height: 1200 },
};
evaluate("pendingImages = new Map([[0, __pending]])");
setFields({ brand: "Rolex", model: "GMT-Master II", reference: "126710GRNR" });
assert.equal(evaluate("saveWatch({ preventDefault: function() {} })"), true);
saved = jsonValue("currentWatches[0]");
assert.equal(saved.brandSlug, "rolex");
assert.deepEqual(saved.images[0], {
  src: "assets/replacement.png",
  alt: "Rolex GMT-Master II, reference 126710GRNR",
  width: 1600,
  height: 1200,
});
assert.deepEqual(saved.images[1], {
  ...images[1],
  alt: "Rolex GMT-Master II, reference 126710GRNR alternate view",
});

const beforeInvalidSave = JSON.stringify(saved);
setFields({ summary: "" });
assert.equal(evaluate("pendingImages = new Map(); saveWatch({ preventDefault: function() {} })"), false);
assert.equal(JSON.stringify(jsonValue("currentWatches[0]")), beforeInvalidSave);
assert.match(String(context.lastToast), /require a summary/i);

context.__invalidImageRecord = { ...record, images: [{ src: "assets/broken.png", alt: "Broken" }] };
evaluate("currentWatches = [normalizeWatch(__invalidImageRecord)]; editingIndex = 0; pendingImages = new Map()");
setFields();
assert.equal(evaluate("saveWatch({ preventDefault: function() {} })"), false);
assert.match(String(context.lastToast), /width, and height/i);

evaluate("currentWatches = [normalizeWatch({ ...__record, indexable: false, summary: '', images: [] })]; editingIndex = 0; pendingImages = new Map()");
setFields({ indexable: false, summary: "" });
assert.equal(evaluate("saveWatch({ preventDefault: function() {} })"), false);
assert.match(String(context.lastToast), /requires at least one image/i);

evaluate("currentWatches = [normalizeWatch({ ...__record, indexable: false, summary: '' })]; editingIndex = 0; pendingImages = new Map()");
setFields({ indexable: false, summary: "" });
assert.equal(evaluate("saveWatch({ preventDefault: function() {} })"), true);
saved = jsonValue("currentWatches[0]");
assert.equal(saved.indexable, false);
assert.equal(saved.summary, "");
assert.equal(saved.images.length, 2);

context.__newPending = {
  file: { name: "new-watch.png" },
  filename: "new-watch.png",
  previewUrl: "data:image/png;base64,new-watch",
  image: { src: "assets/new-watch.png", width: 1200, height: 1200 },
};
evaluate("currentWatches = []; editingIndex = -1; pendingImages = new Map([[0, __newPending]])");
setFields({ brand: "Patek Philippe", model: "Nautilus", reference: "5811/1G-001" });
assert.equal(evaluate("saveWatch({ preventDefault: function() {} })"), true);
saved = jsonValue("currentWatches[0]");
assert.equal(saved.brandSlug, "patek-philippe");
assert.equal(saved.id, "watch-patek-philippe-nautilus-5811-1g-001");
assert.equal(saved.slug, "patek-philippe-nautilus-5811-1g-001");

assert.equal(evaluate("GITHUB_BRANCH"), "master");
assert.equal(evaluate("CATALOG_PATH"), "watches.json");
assert.doesNotMatch(source, /watches\.js(?:["'`]|$)/);
assert.doesNotMatch(managerHtml, /wStatus|In Stock|Reserved|Sold|quickStatusChange/);
const closeAllModalsBody = source.match(/function closeAllModals\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
assert.equal((closeAllModalsBody.match(/document\.body\.style\.overflow\s*=\s*''/g) || []).length, 1);

console.log("Manager catalog contract: PASS");
