#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, "..");
const CANONICAL_ORIGIN = "https://www.chronotomi.com";
const CANONICAL_HOST = "www.chronotomi.com";
const REQUIRED_STATIC_ROUTES = ["/", "/advisory", "/about", "/logistics", "/privacy", "/terms"];
const REQUIRED_GENERATED_ROUTES = ["/watches", "/sourcing", "/authenticity"];
const FIXED_PAGE_ROUTES = ["/", "/watches", "/sourcing", "/authenticity", "/logistics", "/advisory", "/about", "/privacy", "/terms"];
const REQUIRED_REDIRECTS = new Map([
  ["/index", "/"],
  ["/index.html", "/"],
  ["/timepieces", "/watches"],
  ["/advisory.html", "/advisory"],
  ["/about.html", "/about"],
  ["/logistics.html", "/logistics"],
  ["/privacy.html", "/privacy"],
  ["/terms.html", "/terms"],
]);
const REQUIRED_META = [
  ["property", "og:title"],
  ["property", "og:description"],
  ["property", "og:url"],
  ["property", "og:image"],
  ["name", "twitter:card"],
  ["name", "twitter:title"],
  ["name", "twitter:description"],
  ["name", "twitter:image"],
];
const FORBIDDEN_JSON_LD_KEYS = new Set(["offer", "offers", "aggregaterating", "review", "reviews", "rating", "price", "availability"]);
const FORBIDDEN_JSON_LD_TYPES = new Set(["offer", "review", "localbusiness"]);
const FORBIDDEN_INDEXABLE_COPY = [
  { pattern: /\bcurrent\s+(?:timepiece\s+)?collection\b/i, label: "Current Collection" },
  { pattern: /\bverified[\s-]+stock\b/i, label: "verified stock" },
];

const options = parseArgs(process.argv.slice(2));
const root = path.resolve(options.root ?? DEFAULT_ROOT);
const distRoot = path.resolve(options.dist ?? path.join(root, "dist"));
const failures = [];
const notes = [];

function parseArgs(args) {
  const result = { json: false, sourceOnly: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") result.json = true;
    else if (arg === "--source-only") result.sourceOnly = true;
    else if (arg === "--root" || arg === "--dist") {
      const value = args[index + 1];
      if (!value) throw new Error(`${arg} requires a path`);
      result[arg.slice(2)] = value;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return result;
}

function printUsage() {
  console.log(`Usage: node tests/seo-check.mjs [options]

Options:
  --root PATH          Project root (default: repository containing tests/)
  --dist PATH          Generated output directory (default: <root>/dist)
  --source-only        Skip generated-output checks; still audit source contracts
  --json               Emit one structured JSON report instead of human text
`);
}

function addFailure(code, message, details = {}) {
  failures.push({ code, message, ...details });
}

function addNote(code, message, details = {}) {
  notes.push({ code, message, ...details });
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function readJson(filePath, code) {
  const source = readText(filePath);
  if (source === null) {
    addFailure(code, `Required file is missing: ${path.relative(root, filePath) || filePath}`, {
      file: path.relative(root, filePath),
    });
    return null;
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    addFailure(`${code}_INVALID_JSON`, `Invalid JSON in ${path.relative(root, filePath)}: ${error.message}`, {
      file: path.relative(root, filePath),
    });
    return null;
  }
}

function decodeHtml(value) {
  return String(value)
    .replace(/&#(x?[0-9a-f]+);/gi, (_, number) => {
      const radix = number.toLowerCase().startsWith("x") ? 16 : 10;
      const digits = number.toLowerCase().startsWith("x") ? number.slice(1) : number;
      const codePoint = Number.parseInt(digits, radix);
      return Number.isNaN(codePoint) ? _ : String.fromCodePoint(codePoint);
    })
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripTags(value) {
  return decodeHtml(String(value).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function parseAttributes(tag) {
  const attributes = {};
  const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = attributePattern.exec(tag)) !== null) {
    const name = match[1].toLowerCase();
    if (name === "meta" || name === "link" || name === "a" || name === "script" || name === "img") continue;
    attributes[name] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function findTags(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, "gi"))].map((match) => match[0]);
}

function findElements(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)</${tagName}\\s*>`, "gi"))].map((match) => ({
    open: match[0].slice(0, match[0].indexOf(">") + 1),
    body: match[1],
  }));
}

function metaValues(html, attribute, value) {
  return findTags(html, "meta")
    .map(parseAttributes)
    .filter((attrs) => attrs[attribute] && attrs[attribute].toLowerCase() === value.toLowerCase())
    .map((attrs) => attrs.content ?? "");
}

function linkValues(html, rel) {
  return findTags(html, "link")
    .map(parseAttributes)
    .filter((attrs) => (attrs.rel ?? "").split(/\s+/).map((item) => item.toLowerCase()).includes(rel.toLowerCase()))
    .map((attrs) => attrs.href ?? "");
}

function canonicalUrl(route) {
  return `${CANONICAL_ORIGIN}${route === "/" ? "/" : route.replace(/\/+$/, "")}`;
}

function normalizeRoute(value) {
  let raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw, CANONICAL_ORIGIN);
    if (parsed.hostname !== CANONICAL_HOST || (parsed.protocol !== "https:" && parsed.protocol !== "http:")) return null;
    if (parsed.search || parsed.hash) return null;
    raw = parsed.pathname;
  } catch {
    return null;
  }
  if (!raw.startsWith("/")) return null;
  if (raw !== "/") raw = raw.replace(/\/+$/, "");
  return raw || "/";
}

function routeFromRecord(record) {
  const explicit = [record.canonicalPath, record.path, record.route, record.canonicalUrl]
    .find((value) => typeof value === "string" && value.trim());
  if (explicit) {
    const route = normalizeRoute(explicit);
    if (route) return route;
  }
  if (typeof record.slug === "string" && record.slug.trim()) {
    const slug = record.slug.trim().replace(/^\/+|\/+$/g, "").replace(/^watches\/[^/]+\//, "");
    const brand = slugify(record.brandSlug ?? record.brand ?? "brand");
    return normalizeRoute(`/watches/${brand}/${slug}`);
  }
  const brand = slugify(record.brand ?? "brand");
  const reference = slugify(record.reference ?? record.id ?? "watch");
  return `/watches/${brand}-${reference}`;
}

function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isIndexable(record) {
  const seo = record && typeof record.seo === "object" && record.seo !== null ? record.seo : {};
  return record.indexable !== false && record.noindex !== true && record.canonical !== false && seo.indexable !== false && seo.noindex !== true;
}

function recordImages(record) {
  const values = [];
  for (const field of ["image", "imageUrl", "imagePath", "images", "gallery"]) {
    const value = record[field];
    if (Array.isArray(value)) {
      for (const item of value) values.push(typeof item === "string" ? item : item?.src);
    }
    else if (value && typeof value === "object" && typeof value.src === "string") values.push(value.src);
    else if (typeof value === "string") values.push(value);
  }
  return values.filter((value) => typeof value === "string" && value.trim());
}

function inspectCatalog(catalog) {
  if (!Array.isArray(catalog)) {
    addFailure("CATALOG_NOT_ARRAY", "watches.json must contain an array of catalog records", { file: "watches.json" });
    return { records: [], indexable: [], brands: [], brandRoutes: [], expectedWatchRoutes: [] };
  }

  const ids = new Map();
  const slugs = new Map();
  const brandReferences = new Map();
  const indexable = [];

  catalog.forEach((record, index) => {
    const location = `watches.json[${index}]`;
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      addFailure("CATALOG_RECORD_INVALID", `${location} must be an object`, { record: index });
      return;
    }

    for (const field of ["id", "slug"]) {
      const value = record[field];
      if (typeof value !== "string" && typeof value !== "number" || String(value ?? "").trim() === "") {
        addFailure("CATALOG_FIELD_MISSING", `${location} must have a nonempty ${field}`, { record: index, field });
      } else {
        const key = String(value).trim();
        const map = field === "id" ? ids : slugs;
        if (map.has(key)) addFailure("CATALOG_DUPLICATE", `${location} duplicates ${field} "${key}" from record ${map.get(key)}`, { record: index, field, value: key });
        else map.set(key, index);
      }
    }

    for (const field of ["brand", "reference"]) {
      if (typeof record[field] !== "string" || !record[field].trim()) {
        addFailure("CATALOG_FIELD_MISSING", `${location} must have a nonempty ${field}`, { record: index, field });
      }
    }
    if (typeof record.brand === "string" && typeof record.reference === "string" && record.brand.trim() && record.reference.trim()) {
      const key = `${record.brand.trim().toLowerCase()}\u0000${record.reference.trim().toLowerCase()}`;
      if (brandReferences.has(key)) addFailure("CATALOG_DUPLICATE_BRAND_REFERENCE", `${location} duplicates brand + reference from record ${brandReferences.get(key)}`, { record: index, value: `${record.brand} / ${record.reference}` });
      else brandReferences.set(key, index);
    }

    const summary = [record.summary, record.description, record.shortDescription, record.excerpt]
      .find((value) => typeof value === "string" && value.trim());
    if (!summary) addFailure("CATALOG_SUMMARY_MISSING", `${location} needs a nonempty summary, description, shortDescription, or excerpt`, { record: index });

    const images = recordImages(record);
    if (images.length === 0) addFailure("CATALOG_IMAGE_MISSING", `${location} needs at least one image source`, { record: index });
    for (const image of images) checkLocalImage(image, location);

    if (isIndexable(record)) indexable.push({ record, index, route: routeFromRecord(record) });
  });

  const brands = [...new Set(catalog.map((record) => typeof record?.brand === "string" ? record.brand.trim() : "").filter(Boolean))];
  if (brands.length !== 4) addFailure("BRAND_COUNT", `Expected exactly four catalog brands for four brand routes; found ${brands.length}: ${brands.join(", ") || "none"}`, { brands });

  const brandSlugs = new Map();
  for (const record of catalog) {
    if (typeof record?.brand !== "string" || !record.brand.trim()) continue;
    const brand = record.brand.trim();
    const candidate = typeof record.brandSlug === "string" && record.brandSlug.trim() ? record.brandSlug.trim() : slugify(brand);
    if (brandSlugs.has(brand) && brandSlugs.get(brand) !== candidate) addFailure("BRAND_SLUG_INCONSISTENT", `Catalog uses more than one brand slug for ${brand}: ${brandSlugs.get(brand)} and ${candidate}`, { brand });
    else brandSlugs.set(brand, candidate);
  }
  const brandRoutes = brands.map((brand) => ({ brand, route: `/watches/${slugify(brandSlugs.get(brand) ?? brand)}` }));
  const expectedWatchRoutes = indexable.map((entry) => entry.route);
  const routeCounts = new Map();
  for (const entry of indexable) routeCounts.set(entry.route, (routeCounts.get(entry.route) ?? 0) + 1);
  for (const [route, count] of routeCounts) {
    if (count > 1) addFailure("WATCH_ROUTE_DUPLICATE", `${count} indexable records resolve to the same watch route ${route}`, { route });
  }
  for (const entry of indexable) {
    if (!entry.route.startsWith("/watches/") || entry.route === "/watches/") addFailure("WATCH_ROUTE_SCOPE", `Indexable catalog record ${entry.index} resolves outside the /watches/<slug> route namespace: ${entry.route}`, { record: entry.index, route: entry.route });
  }

  return { records: catalog, indexable, brands, brandRoutes, expectedWatchRoutes };
}

function checkLocalImage(source, location) {
  const value = source.trim();
  if (/^(?:data:|https?:|\/\/)/i.test(value)) return;
  const withoutQuery = value.split(/[?#]/, 1)[0];
  const relative = withoutQuery.startsWith("/") ? withoutQuery.slice(1) : withoutQuery.replace(/^\.\//, "");
  const imagePath = path.resolve(root, relative);
  if (!imagePath.startsWith(`${root}${path.sep}`) && imagePath !== root) {
    addFailure("IMAGE_PATH_OUTSIDE_ROOT", `${location} image source escapes the project root: ${source}`, { source });
    return;
  }
  if (!fs.existsSync(imagePath) || !fs.statSync(imagePath).isFile()) addFailure("IMAGE_MISSING", `${location} local image does not exist: ${source}`, { source, file: path.relative(root, imagePath) });
}

function inspectPackage() {
  const packageJson = readJson(path.join(root, "package.json"), "PACKAGE");
  if (!packageJson) return;
  const buildCommand = packageJson.scripts?.build;
  if (typeof buildCommand !== "string" || !buildCommand.trim()) {
    addFailure("BUILD_SCRIPT_MISSING", "npm run build must be defined and produce dist/", { file: "package.json", expected: "scripts.build" });
    return;
  }
  const nodeEntry = buildCommand.match(/(?:^|\s)node\s+(?!-)([^\s]+)/);
  if (nodeEntry) {
    const entry = nodeEntry[1].replace(/^['"]|['"]$/g, "");
    const entryPath = path.resolve(root, entry);
    if (!fs.existsSync(entryPath) || !fs.statSync(entryPath).isFile()) addFailure("BUILD_ENTRY_MISSING", `npm run build points to a missing local entry file: ${entry}`, { file: "package.json", entry });
  }
}

function normalizeMetadata(value) {
  return decodeHtml(String(value ?? "")).replace(/\s+/g, " ").trim().toLowerCase();
}

function inspectSiteConfig(site) {
  if (!site || typeof site !== "object" || Array.isArray(site)) return;
  if (!site.pages || typeof site.pages !== "object" || Array.isArray(site.pages)) {
    addFailure("SITE_PAGES_MISSING", "site.json must contain a pages map", { file: "site.json" });
    return;
  }
  const configured = Object.keys(site.pages).sort();
  const expected = [...FIXED_PAGE_ROUTES].sort();
  if (configured.join("\n") !== expected.join("\n")) addFailure("SITE_PAGES_ROUTE_SET", `site.json pages must contain exactly: ${FIXED_PAGE_ROUTES.join(", ")}`, { file: "site.json", found: configured, expected });
  const titles = new Map(), descriptions = new Map();
  for (const route of FIXED_PAGE_ROUTES) {
    const page = site.pages[route];
    for (const field of ["title", "description"]) {
      if (typeof page?.[field] !== "string" || !page[field].trim()) addFailure("SITE_PAGE_METADATA_MISSING", `site.json pages[${route}].${field} must be nonempty`, { file: "site.json", route, field });
    }
    if (!page) continue;
    for (const [field, registry] of [["title", titles], ["description", descriptions]]) {
      const key = normalizeMetadata(page[field]);
      if (!key) continue;
      if (registry.has(key)) addFailure("SITE_PAGE_METADATA_DUPLICATE", `site.json pages ${route} and ${registry.get(key)} share the same ${field}`, { file: "site.json", route, priorRoute: registry.get(key), field });
      else registry.set(key, route);
    }
  }
  if (typeof site.socialDefaults?.image !== "string" || !site.socialDefaults.image.startsWith("/assets/")) addFailure("SITE_SOCIAL_DEFAULT", "site.json socialDefaults.image must be an /assets path", { file: "site.json", field: "socialDefaults.image" });
  else checkLocalImage(site.socialDefaults.image, "site.json socialDefaults.image");
  if (typeof site.socialDefaults?.imageAlt !== "string" || !site.socialDefaults.imageAlt.trim()) addFailure("SITE_SOCIAL_DEFAULT", "site.json socialDefaults.imageAlt must be nonempty", { file: "site.json", field: "socialDefaults.imageAlt" });
}

function inspectVercelConfig(vercel) {
  if (!vercel || typeof vercel !== "object" || Array.isArray(vercel)) return;
  if (vercel.buildCommand !== "npm run build") addFailure("VERCEL_BUILD_COMMAND", 'vercel.json buildCommand must be exactly "npm run build"', { file: "vercel.json", found: vercel.buildCommand });
  if (vercel.outputDirectory !== "dist") addFailure("VERCEL_OUTPUT_DIRECTORY", 'vercel.json outputDirectory must be exactly "dist"', { file: "vercel.json", found: vercel.outputDirectory });
  if (vercel.cleanUrls !== true) addFailure("VERCEL_CLEAN_URLS", "vercel.json cleanUrls must be true", { file: "vercel.json", found: vercel.cleanUrls });
  if (vercel.trailingSlash !== false) addFailure("VERCEL_TRAILING_SLASH", "vercel.json trailingSlash must be false", { file: "vercel.json", found: vercel.trailingSlash });

  const redirects = Array.isArray(vercel.redirects) ? vercel.redirects : [];
  for (const [source, destination] of REQUIRED_REDIRECTS) {
    const matches = redirects.filter((redirect) => redirect?.source === source);
    if (matches.length !== 1) addFailure("VERCEL_REDIRECT_COUNT", `vercel.json must contain exactly one redirect for ${source}`, { file: "vercel.json", source, count: matches.length });
    else if (matches[0].destination !== destination || matches[0].permanent !== true) addFailure("VERCEL_REDIRECT_CONTRACT", `vercel.json redirect ${source} must permanently target ${destination}`, { file: "vercel.json", source, expectedDestination: destination, found: matches[0] });
  }

  const manageRules = (Array.isArray(vercel.headers) ? vercel.headers : []).filter((rule) => rule?.source === "/manage");
  if (manageRules.length !== 1) addFailure("VERCEL_MANAGE_HEADER_RULE", "vercel.json must contain exactly one /manage header rule", { file: "vercel.json", count: manageRules.length });
  else {
    const robotsHeaders = (Array.isArray(manageRules[0].headers) ? manageRules[0].headers : []).filter((header) => String(header?.key ?? "").toLowerCase() === "x-robots-tag");
    if (robotsHeaders.length !== 1) addFailure("VERCEL_MANAGE_ROBOTS_HEADER", "/manage must contain exactly one X-Robots-Tag header", { file: "vercel.json", count: robotsHeaders.length });
    else {
      const directives = new Set(String(robotsHeaders[0].value ?? "").toLowerCase().split(",").map((value) => value.trim()).filter(Boolean));
      for (const directive of ["noindex", "nofollow", "noarchive"]) if (!directives.has(directive)) addFailure("VERCEL_MANAGE_ROBOTS_DIRECTIVE", `/manage X-Robots-Tag must contain ${directive}`, { file: "vercel.json", directive, found: robotsHeaders[0].value });
    }
  }
}

function inspectHtml(route, html, label, context = {}) {
  if (!html.includes('class="quark-shimmer" data-text="Quark">Quark</span>')) {
    addFailure("QUARK_SHIMMER_MARKUP", `${label} must mark the footer Quark credit for the shimmer effect`, { route, file: label });
  }
  const title = findElements(html, "title").map((element) => stripTags(element.body)).filter(Boolean);
  if (title.length !== 1) addFailure("HTML_TITLE_COUNT", `${label} must contain exactly one nonempty <title>; found ${title.length}`, { route, file: label });

  const descriptions = metaValues(html, "name", "description").map((value) => value.trim()).filter(Boolean);
  if (descriptions.length !== 1) addFailure("META_DESCRIPTION_COUNT", `${label} must contain exactly one nonempty meta description; found ${descriptions.length}`, { route, file: label });

  const configuredPage = context.site?.pages?.[route];
  if (configuredPage && title.length === 1 && title[0] !== configuredPage.title) addFailure("SITE_PAGE_TITLE_DRIFT", `${label} title does not match site.json pages[${route}].title`, { route, file: label, expected: configuredPage.title, found: title[0] });
  if (configuredPage && descriptions.length === 1 && descriptions[0] !== configuredPage.description) addFailure("SITE_PAGE_DESCRIPTION_DRIFT", `${label} description does not match site.json pages[${route}].description`, { route, file: label, expected: configuredPage.description, found: descriptions[0] });
  if (context.metadataRegistry) {
    registerUniqueMetadata(context.metadataRegistry.titles, "title", title[0], route, label);
    registerUniqueMetadata(context.metadataRegistry.descriptions, "meta description", descriptions[0], route, label);
  }

  const canonicalValues = linkValues(html, "canonical").filter(Boolean);
  if (canonicalValues.length !== 1) addFailure("CANONICAL_COUNT", `${label} must contain exactly one canonical link; found ${canonicalValues.length}`, { route, file: label, expected: canonicalUrl(route) });
  else if (canonicalValues[0] !== canonicalUrl(route)) addFailure("CANONICAL_MISMATCH", `${label} canonical must be ${canonicalUrl(route)}; found ${canonicalValues[0]}`, { route, file: label, found: canonicalValues[0], expected: canonicalUrl(route) });

  const h1s = findElements(html, "h1").map((element) => stripTags(element.body)).filter(Boolean);
  if (h1s.length !== 1) addFailure("H1_COUNT", `${label} must contain exactly one nonempty <h1>; found ${h1s.length}`, { route, file: label });

  const pageText = stripTags(html);
  for (const forbidden of FORBIDDEN_INDEXABLE_COPY) {
    if (forbidden.pattern.test(pageText)) addFailure("INDEXABLE_COPY_STOCK_CLAIM", `${label} uses forbidden stock-implying phrasing: ${forbidden.label}`, { route, file: label, phrase: forbidden.label });
  }

  for (const [attribute, value] of REQUIRED_META) {
    const values = metaValues(html, attribute, value).map((item) => item.trim()).filter(Boolean);
    if (values.length !== 1) addFailure("SOCIAL_META", `${label} must contain exactly one nonempty meta ${attribute}="${value}"; found ${values.length}`, { route, file: label, field: value });
    else if (value === "og:url" && values[0] !== canonicalUrl(route)) addFailure("OG_URL_MISMATCH", `${label} og:url must be ${canonicalUrl(route)}; found ${values[0]}`, { route, file: label, found: values[0], expected: canonicalUrl(route) });
    if (configuredPage && values.length === 1) {
      const expected = value.endsWith(":title") ? configuredPage.title
        : value.endsWith(":description") ? configuredPage.description
        : value === "og:image" || value === "twitter:image" ? `${context.site.origin}${context.site.socialDefaults.image}`
        : null;
      if (expected !== null && values[0] !== expected) addFailure("SITE_PAGE_SOCIAL_META_DRIFT", `${label} ${value} does not match site.json metadata`, { route, file: label, field: value, expected, found: values[0] });
    }
  }

  const stylesheetOwners = new Map();
  for (const href of linkValues(html, "stylesheet").filter(Boolean)) {
    let normalized;
    try {
      const url = new URL(href, canonicalUrl(route));
      url.search = "";
      url.hash = "";
      normalized = url.href;
    } catch {
      normalized = href;
    }
    if (stylesheetOwners.has(normalized)) addFailure("STYLESHEET_DUPLICATE", `${label} references stylesheet asset ${normalized} more than once`, { route, file: label, href, priorHref: stylesheetOwners.get(normalized) });
    else stylesheetOwners.set(normalized, href);
  }

  const jsonLdScripts = findElements(html, "script").filter((element) => {
    const attrs = parseAttributes(element.open);
    return (attrs.type ?? "").toLowerCase() === "application/ld+json";
  });
  const schemaTypes = new Set();
  if (jsonLdScripts.length === 0) addFailure("JSON_LD_MISSING", `${label} must contain parseable application/ld+json`, { route, file: label });
  for (const [scriptIndex, script] of jsonLdScripts.entries()) {
    let parsed;
    try {
      parsed = JSON.parse(script.body.trim());
    } catch (error) {
      addFailure("JSON_LD_INVALID", `${label} JSON-LD block ${scriptIndex + 1} is not valid JSON: ${error.message}`, { route, file: label, block: scriptIndex + 1 });
      continue;
    }
    collectJsonLdTypes(parsed, schemaTypes);
    inspectJsonLd(parsed, `${label} JSON-LD block ${scriptIndex + 1}`, route);
  }
  for (const requiredType of requiredSchemaTypes(route)) {
    if (!schemaTypes.has(requiredType)) addFailure("JSON_LD_REQUIRED_TYPE", `${label} must include JSON-LD type ${requiredType}`, { route, file: label, type: requiredType, found: [...schemaTypes].sort() });
  }

  inspectResponsiveCatalogImages(route, html, label, context.catalogImageSources);
  inspectInquiryCtas(route, html, label, context.watchByRoute);
  inspectInternalLinks(html, route, label);
}

function inspectQuarkShimmerStyles() {
  const stylesheet = readText(path.join(root, "styles.css"));
  if (stylesheet === null) return;
  if (!stylesheet.includes("@keyframes quarkGlimmerSweep")) addFailure("QUARK_SHIMMER_KEYFRAMES", "styles.css must define the Quark glimmer sweep animation", { file: "styles.css" });
  if (!stylesheet.includes(".quark-shimmer::after")) addFailure("QUARK_SHIMMER_OVERLAY", "styles.css must clip the shimmer overlay to the Quark text", { file: "styles.css" });
  if (!stylesheet.includes("background-repeat: no-repeat")) addFailure("QUARK_SHIMMER_SINGLE_PASS", "styles.css must prevent the Quark shimmer gradient from tiling into a second pass", { file: "styles.css" });
  if (!/@keyframes quarkGlimmerSweep\s*\{[\s\S]*?0%\s*\{[\s\S]*?background-position:\s*150%\s+0;[\s\S]*?50%,\s*100%\s*\{[\s\S]*?background-position:\s*-150%\s+0;/.test(stylesheet)) addFailure("QUARK_SHIMMER_LUMINA_TIMING", "styles.css must match Lumina's one-pass 0–50% glimmer sweep and off-screen rest", { file: "styles.css" });
  if (!stylesheet.includes("prefers-reduced-motion: reduce")) addFailure("QUARK_SHIMMER_REDUCED_MOTION", "styles.css must disable the Quark shimmer for reduced-motion users", { file: "styles.css" });
}

function registerUniqueMetadata(registry, kind, value, route, label) {
  const normalized = normalizeMetadata(value);
  if (!normalized) return;
  const prior = registry.get(normalized);
  if (prior) addFailure("INDEXABLE_METADATA_DUPLICATE", `${label} duplicates ${kind} from ${prior.file}`, { route, file: label, priorRoute: prior.route, priorFile: prior.file, field: kind, value });
  else registry.set(normalized, { route, file: label });
}

function resolvedAssetPath(value, route) {
  try {
    const url = new URL(value, canonicalUrl(route));
    if (url.hostname !== CANONICAL_HOST) return null;
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

function expectedResponsivePaths(source, extension) {
  const currentExtension = path.extname(source);
  if (!currentExtension) return [];
  const stem = source.slice(0, -currentExtension.length);
  return [`${stem}-400.${extension}`, `${stem}-800.${extension}`, `${stem}.${extension}`].filter((candidate) => {
    try { return fs.statSync(path.join(root, candidate)).isFile(); } catch { return false; }
  });
}

function parseSrcset(value, route, label, elementLabel) {
  if (typeof value !== "string" || !value.trim()) {
    addFailure("CATALOG_IMAGE_SRCSET", `${label} ${elementLabel} must contain a responsive srcset`, { route, file: label });
    return [];
  }
  const candidates = [];
  for (const part of value.split(",")) {
    const match = part.trim().match(/^(\S+)\s+(\d+)w$/);
    if (!match || Number(match[2]) < 1) {
      addFailure("CATALOG_IMAGE_SRCSET_DESCRIPTOR", `${label} ${elementLabel} has an invalid width-descriptor srcset candidate: ${part.trim()}`, { route, file: label, candidate: part.trim() });
      continue;
    }
    const asset = resolvedAssetPath(match[1], route);
    candidates.push({ asset, width: Number(match[2]) });
    if (!asset) addFailure("CATALOG_IMAGE_SRCSET_URL", `${label} ${elementLabel} srcset must reference a canonical-host asset`, { route, file: label, candidate: match[1] });
    else {
      const target = path.resolve(distRoot, asset);
      if (!target.startsWith(`${distRoot}${path.sep}`) || !fs.existsSync(target) || !fs.statSync(target).isFile()) addFailure("CATALOG_IMAGE_SRCSET_MISSING", `${label} ${elementLabel} references a missing generated asset: ${asset}`, { route, file: label, asset });
    }
  }
  return candidates;
}

function inspectResponsiveCatalogImages(route, html, label, catalogImageSources) {
  if (!(catalogImageSources instanceof Set) || catalogImageSources.size === 0) return;
  let found = 0;
  for (const picture of findElements(html, "picture")) {
    const imageTag = findTags(picture.body, "img")[0];
    if (!imageTag) continue;
    const image = parseAttributes(imageTag);
    const sourcePath = resolvedAssetPath(image.src, route);
    if (!sourcePath || !catalogImageSources.has(sourcePath)) continue;
    found += 1;
    if (!/^\d+$/.test(image.width ?? "") || Number(image.width) < 1 || !/^\d+$/.test(image.height ?? "") || Number(image.height) < 1) addFailure("CATALOG_IMAGE_DIMENSIONS", `${label} catalog image ${sourcePath} must have positive width and height attributes`, { route, file: label, source: sourcePath, width: image.width, height: image.height });
    if (typeof image.sizes !== "string" || !image.sizes.trim()) addFailure("CATALOG_IMAGE_SIZES", `${label} catalog image ${sourcePath} must have sizes`, { route, file: label, source: sourcePath });
    const fallbackCandidates = parseSrcset(image.srcset, route, label, `img for ${sourcePath}`);
    const fallbackExtension = path.extname(sourcePath).slice(1).toLowerCase();
    for (const expected of expectedResponsivePaths(sourcePath, fallbackExtension)) if (!fallbackCandidates.some((candidate) => candidate.asset === expected)) addFailure("CATALOG_IMAGE_VARIANT_OMITTED", `${label} img srcset omits existing responsive asset ${expected}`, { route, file: label, source: sourcePath, expected });

    const sources = findTags(picture.body, "source").map((tag) => parseAttributes(tag));
    for (const format of ["avif", "webp"]) {
      const expected = expectedResponsivePaths(sourcePath, format);
      if (!expected.length) continue;
      const source = sources.find((attrs) => attrs.type?.toLowerCase() === `image/${format}`);
      if (!source) {
        addFailure("CATALOG_IMAGE_SOURCE_MISSING", `${label} catalog image ${sourcePath} is missing its ${format.toUpperCase()} source`, { route, file: label, source: sourcePath, format });
        continue;
      }
      if (typeof source.sizes !== "string" || !source.sizes.trim()) addFailure("CATALOG_IMAGE_SIZES", `${label} ${format.toUpperCase()} source for ${sourcePath} must have sizes`, { route, file: label, source: sourcePath, format });
      const candidates = parseSrcset(source.srcset, route, label, `${format.toUpperCase()} source for ${sourcePath}`);
      for (const asset of expected) if (!candidates.some((candidate) => candidate.asset === asset)) addFailure("CATALOG_IMAGE_VARIANT_OMITTED", `${label} ${format.toUpperCase()} srcset omits existing responsive asset ${asset}`, { route, file: label, source: sourcePath, format, expected: asset });
    }
  }
  if ((route === "/" || route === "/watches" || /^\/watches\/[^/]+(?:\/[^/]+)?$/.test(route)) && found === 0) addFailure("CATALOG_RESPONSIVE_IMAGE_MISSING", `${label} must contain generated responsive catalog images`, { route, file: label });
}

function inspectInquiryCtas(route, html, label, watchByRoute) {
  const links = findTags(html, "a").map((tag) => parseAttributes(tag));
  if (route === "/sourcing" && !links.some((attrs) => attrs.class?.split(/\s+/).includes("btn-primary") && attrs.href === "/#source")) addFailure("SOURCING_CTA_TARGET", `${label} primary sourcing CTA must target /#source`, { route, file: label, expected: "/#source" });
  const watch = watchByRoute?.get(route);
  if (watch) {
    const expected = `/?watch=${encodeURIComponent(watch.id)}#inquire`;
    if (!links.some((attrs) => attrs.class?.split(/\s+/).includes("btn-primary") && attrs.href === expected)) addFailure("WATCH_CTA_TARGET", `${label} primary watch CTA must carry immutable watch id ${watch.id}`, { route, file: label, expected, watchId: watch.id });
  }
}

function collectJsonLdTypes(value, types) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonLdTypes(item, types));
    return;
  }
  if (!value || typeof value !== "object") return;
  if (typeof value["@type"] === "string") types.add(value["@type"]);
  else if (Array.isArray(value["@type"])) value["@type"].forEach((type) => types.add(String(type)));
  Object.values(value).forEach((child) => collectJsonLdTypes(child, types));
}

function requiredSchemaTypes(route) {
  if (route === "/") return ["Organization", "WebSite"];
  if (route === "/about") return ["AboutPage", "Organization"];
  if (["/sourcing", "/authenticity", "/logistics"].includes(route)) return ["Service", "BreadcrumbList"];
  if (route === "/watches" || /^\/watches\/[^/]+$/.test(route)) return ["CollectionPage", "ItemList"];
  if (/^\/watches\/[^/]+\/[^/]+$/.test(route)) return ["Product", "BreadcrumbList"];
  return [];
}

function inspectJsonLd(value, location, route, keyPath = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectJsonLd(item, location, route, `${keyPath}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase().replace(/^@/, "");
    if (FORBIDDEN_JSON_LD_KEYS.has(normalizedKey)) addFailure("JSON_LD_FORBIDDEN", `${location} uses forbidden JSON-LD property "${key}" at ${keyPath}`, { route, file: location.split(" JSON-LD")[0], property: key, path: `${keyPath}.${key}` });
    if (normalizedKey === "type") {
      const types = Array.isArray(child) ? child : [child];
      for (const type of types) if (FORBIDDEN_JSON_LD_TYPES.has(String(type).toLowerCase())) addFailure("JSON_LD_FORBIDDEN", `${location} uses forbidden JSON-LD type "${type}" at ${keyPath}.${key}`, { route, property: "@type", value: type, path: `${keyPath}.${key}` });
    }
    inspectJsonLd(child, location, route, `${keyPath}.${key}`);
  }
}

function inspectInternalLinks(html, route, label) {
  for (const tag of findTags(html, "a")) {
    const href = parseAttributes(tag).href?.trim();
    if (!href || href.startsWith("#") || /^(?:mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    let url;
    try {
      url = new URL(href, canonicalUrl(route));
    } catch {
      continue;
    }
    if (url.hostname !== CANONICAL_HOST) continue;
    if (url.pathname.toLowerCase().endsWith(".html") || /\/index\.html$/i.test(url.pathname)) {
      addFailure("INTERNAL_HTML_LINK", `${label} uses a non-clean internal link: ${href}`, { route, file: label, href });
    }
  }
}

function distCandidates(route) {
  if (route === "/") return [path.join(distRoot, "index.html")];
  const relative = route.slice(1);
  return [
    path.join(distRoot, relative),
    path.join(distRoot, relative, "index.html"),
    path.join(distRoot, `${relative}.html`),
  ];
}

function sourceCandidates(route) {
  if (route === "/") return [path.join(root, "index.html")];
  const relative = route.slice(1);
  return [path.join(root, relative), path.join(root, relative, "index.html"), path.join(root, `${relative}.html`)];
}

function existingFile(candidates) {
  return candidates.find((candidate) => {
    try { return fs.statSync(candidate).isFile(); } catch { return false; }
  }) ?? null;
}

function inspectRoutePages(expectedRoutes, hasDist, context) {
  if (!hasDist && !options.sourceOnly) {
    addFailure("DIST_MISSING", `Generated output directory is missing: ${path.relative(root, distRoot) || distRoot}. Run npm run build before generated-site validation.`, { file: path.relative(root, distRoot), expected: "dist/" });
  }
  for (const route of expectedRoutes) {
    if (hasDist && !options.sourceOnly) {
      const generated = existingFile(distCandidates(route));
      if (!generated) addFailure("ROUTE_OUTPUT_MISSING", `Expected route ${route} has no clean output file or directory index in ${path.relative(root, distRoot)}/`, { route, file: path.relative(root, distRoot), expected: distCandidates(route).map((item) => path.relative(root, item)) });
      else inspectHtml(route, readText(generated), path.relative(root, generated), context);
    }

    const source = existingFile(sourceCandidates(route));
    if (source && (!hasDist || options.sourceOnly)) inspectHtml(route, readText(source), path.relative(root, source), context);
  }
}

function inspectHomepageSource(catalogInfo, hasDist) {
  const homepagePath = !options.sourceOnly && hasDist ? path.join(distRoot, "index.html") : path.join(root, "index.html");
  const homepage = readText(homepagePath);
  if (homepage === null) return;
  const homepageLabel = path.relative(root, homepagePath);
  const indexable = catalogInfo.indexable;
  const links = findTags(homepage, "a").map((tag) => parseAttributes(tag).href).filter(Boolean);
  for (const entry of indexable) {
    const record = entry.record;
    const identity = [record.id, record.reference].filter((value) => value !== undefined && value !== null && String(value).trim()).map(String);
    for (const token of identity) {
      if (!homepage.includes(token)) addFailure("HOMEPAGE_ID_MISSING", `Homepage initial HTML does not contain indexable watch identity "${token}" from watches.json[${entry.index}]`, { file: homepageLabel, record: entry.index, token });
    }
    const hasCrawlableRoute = links.some((href) => {
      try { return normalizeRoute(new URL(href, canonicalUrl("/")).href) === entry.route; } catch { return false; }
    });
    if (!hasCrawlableRoute) addFailure("HOMEPAGE_WATCH_LINK_MISSING", `Homepage initial HTML lacks a crawlable link to ${entry.route} for watches.json[${entry.index}]`, { file: homepageLabel, record: entry.index, route: entry.route });
  }
}

function inspectRobotsAndSitemap(expectedRoutes) {
  const robotsPath = path.join(distRoot, "robots.txt");
  const sitemapPath = path.join(distRoot, "sitemap.xml");
  const robots = readText(robotsPath);
  if (robots === null) addFailure("ROBOTS_MISSING", `robots.txt is missing from ${path.relative(root, distRoot)}/`, { file: path.relative(root, robotsPath) });
  else {
    const sitemapRefs = [...robots.matchAll(/^\s*Sitemap:\s*(\S+)\s*$/gim)].map((match) => match[1]);
    if (!sitemapRefs.includes(`${CANONICAL_ORIGIN}/sitemap.xml`)) addFailure("ROBOTS_SITEMAP_REF", `robots.txt must reference ${CANONICAL_ORIGIN}/sitemap.xml`, { file: path.relative(root, robotsPath), expected: `${CANONICAL_ORIGIN}/sitemap.xml` });
  }
  const sitemap = readText(sitemapPath);
  if (sitemap === null) {
    addFailure("SITEMAP_MISSING", `sitemap.xml is missing from ${path.relative(root, distRoot)}/`, { file: path.relative(root, sitemapPath) });
    return;
  }
  const locations = [...sitemap.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc\s*>/gi)].map((match) => decodeHtml(stripTags(match[1]).trim()));
  const expected = expectedRoutes.map(canonicalUrl);
  const actualCounts = new Map();
  for (const location of locations) actualCounts.set(location, (actualCounts.get(location) ?? 0) + 1);
  for (const route of expectedRoutes) {
    const url = canonicalUrl(route);
    if (!actualCounts.has(url)) addFailure("SITEMAP_ROUTE_MISSING", `sitemap.xml is missing canonical route ${url}`, { file: path.relative(root, sitemapPath), route, expected: url });
    else if (actualCounts.get(url) !== 1) addFailure("SITEMAP_DUPLICATE", `sitemap.xml must include ${url} exactly once; found ${actualCounts.get(url)}`, { file: path.relative(root, sitemapPath), route, count: actualCounts.get(url) });
  }
  for (const [location, count] of actualCounts) {
    let route = null;
    try { route = normalizeRoute(location); } catch { /* handled below */ }
    if (!expected.includes(location)) addFailure("SITEMAP_UNEXPECTED_ROUTE", `sitemap.xml contains a non-canonical or unintended URL: ${location}`, { file: path.relative(root, sitemapPath), url: location, count, route });
    if (route && /\/(?:manage|assets)(?:\/|$)/i.test(route)) addFailure("SITEMAP_EXCLUDED_PATH", `sitemap.xml must exclude manage/assets paths: ${location}`, { file: path.relative(root, sitemapPath), url: location, route });
    if (route && redirectPaths.has(route)) addFailure("SITEMAP_REDIRECT_PATH", `sitemap.xml must exclude redirect source path ${route}: ${location}`, { file: path.relative(root, sitemapPath), url: location, route });
  }
}

function inspectRouteSet(expectedRoutes) {
  const seen = new Set();
  for (const route of expectedRoutes) {
    if (seen.has(route)) addFailure("EXPECTED_ROUTE_DUPLICATE", `Expected route inventory contains ${route} more than once`, { route });
    seen.add(route);
    if (route !== "/" && /\/$/.test(route)) addFailure("EXPECTED_TRAILING_SLASH", `Expected route has a trailing slash: ${route}`, { route });
    if (/\.html$/i.test(route)) addFailure("EXPECTED_HTML_ROUTE", `Expected route must be extensionless: ${route}`, { route });
  }
}

function loadRedirectPaths(vercel) {
  const paths = new Set();
  for (const redirect of Array.isArray(vercel?.redirects) ? vercel.redirects : []) {
    if (typeof redirect?.source === "string") {
      const normalized = normalizeRoute(redirect.source.replace(/\(.*?\)/g, ""));
      if (normalized) paths.add(normalized);
    }
  }
  return paths;
}

let redirectPaths = new Set();
function main() {
  inspectPackage();
  const vercel = readJson(path.join(root, "vercel.json"), "VERCEL");
  inspectVercelConfig(vercel);
  redirectPaths = loadRedirectPaths(vercel);
  const site = readJson(path.join(root, "site.json"), "SITE");
  inspectSiteConfig(site);
  const catalog = readJson(path.join(root, "watches.json"), "CATALOG");
  const catalogInfo = inspectCatalog(catalog);
  const expectedRoutes = [...REQUIRED_STATIC_ROUTES, ...REQUIRED_GENERATED_ROUTES, ...catalogInfo.brandRoutes.map((entry) => entry.route), ...catalogInfo.expectedWatchRoutes];
  inspectRouteSet(expectedRoutes);

  const hasDist = fs.existsSync(distRoot) && fs.statSync(distRoot).isDirectory();
  const context = {
    site,
    metadataRegistry: { titles: new Map(), descriptions: new Map() },
    catalogImageSources: hasDist && !options.sourceOnly ? new Set(catalogInfo.records.flatMap((record) => recordImages(record)).map((source) => source.replace(/^\/+|^\.\//g, "").split(/[?#]/, 1)[0])) : new Set(),
    watchByRoute: new Map(catalogInfo.indexable.map((entry) => [entry.route, entry.record])),
  };
  if (!options.sourceOnly) inspectHomepageSource(catalogInfo, hasDist);
  inspectRoutePages(expectedRoutes, hasDist, context);
  inspectQuarkShimmerStyles();
  if (hasDist && !options.sourceOnly) inspectRobotsAndSitemap(expectedRoutes);
  else if (!options.sourceOnly) addFailure("GENERATED_CHECKS_SKIPPED", "robots.txt and sitemap.xml checks were skipped because dist/ is unavailable; run after npm run build", { expected: "dist/robots.txt and dist/sitemap.xml" });

  if (catalogInfo.indexable.length === 0) addNote("NO_INDEXABLE_RECORDS", "No indexable catalog records were available to derive watch routes.");
  addNote("ROUTE_DERIVATION", "Watch routes use explicit canonicalPath/path/route/canonicalUrl first, then /watches/<brandSlug>/<slug>, then a deterministic brand-reference fallback. Missing id/slug remains an error.");
  addNote("PARSER_SCOPE", "HTML and XML are checked with dependency-free structural parsing; this intentionally validates serialized HTML and does not execute JavaScript.");

  const report = {
    ok: failures.length === 0,
    root,
    dist: distRoot,
    canonicalOrigin: CANONICAL_ORIGIN,
    expectedRoutes,
    catalog: {
      records: catalogInfo.records.length,
      indexableRecords: catalogInfo.indexable.length,
      brands: catalogInfo.brands,
    },
    failures,
    notes,
  };
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else printHumanReport(report);
  process.exitCode = report.ok ? 0 : 1;
}

function printHumanReport(report) {
  console.log(`SEO contract verifier: ${report.ok ? "PASS" : "FAIL"}`);
  console.log(`Root: ${report.root}`);
  console.log(`Expected canonical routes: ${report.expectedRoutes.length}`);
  if (report.failures.length) {
    console.log(`Failures: ${report.failures.length}`);
    for (const failure of report.failures) {
      const scope = failure.route ? ` [${failure.route}]` : failure.file ? ` [${failure.file}]` : "";
      console.log(`- ${failure.code}${scope}: ${failure.message}`);
    }
  } else console.log("Failures: 0");
  if (report.notes.length) {
    console.log("Notes:");
    for (const note of report.notes) console.log(`- ${note.code}: ${note.message}`);
  }
}

try {
  main();
} catch (error) {
  if (options.json) console.log(JSON.stringify({ ok: false, root, dist: distRoot, failures: [{ code: "HARNESS_ERROR", message: error.message }], notes }, null, 2));
  else console.error(`SEO contract verifier: HARNESS_ERROR: ${error.message}`);
  process.exitCode = 1;
}
