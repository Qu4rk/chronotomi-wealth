import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { brandIntroductions, guides, journalPage, locationPages } from "../content/seo-content.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://www.chronotomi.com";
const HTML_PAGES = ["index.html", "advisory.html", "about.html", "logistics.html", "privacy.html", "terms.html", "manage.html"];
const PUBLIC_FILES = ["styles.css", "script.js", "manage.js", "watches.json", "site.json"];
const STATIC_ROUTES = [
  ["/advisory", "advisory.html"],
  ["/about", "about.html"],
  ["/logistics", "logistics.html"],
  ["/privacy", "privacy.html"],
  ["/terms", "terms.html"],
];
const FIXED_PAGE_ROUTES = ["/", "/watches", "/sourcing", "/authenticity", "/logistics", "/advisory", "/about", "/privacy", "/terms"];
const REQUIRED_BRAND_SLUGS = ["rolex", "patek-philippe", "audemars-piguet", "cartier"];
const CARD_IMAGE_SIZES = "(max-width: 800px) 100vw, 33vw";
const DETAIL_IMAGE_SIZES = "(max-width: 800px) 100vw, 55vw";
const GALLERY_IMAGE_SIZES = "(max-width: 800px) 50vw, 27vw";

function fail(message) { throw new Error("[build-site] " + message); }
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { fail("cannot read " + file + ": " + error.message); }
}
function esc(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function slugify(value) {
  return String(value).toLowerCase().replaceAll("&", "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function nonEmpty(value, label) {
  if (typeof value !== "string" || !value.trim()) fail(label + " must be a non-empty string");
}
function isoDate(value, label) {
  nonEmpty(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value + "T00:00:00Z"))) fail(label + " must be YYYY-MM-DD");
}
function routePath(value, label) {
  nonEmpty(value, label);
  if (value === "/" || !value.startsWith("/") || /\/$/.test(value) || /[?#]/.test(value) || /\.html$/i.test(value)) fail(label + " must be an extensionless absolute route without a trailing slash");
  return value;
}
function ctaPath(value, label) {
  nonEmpty(value, label);
  if (!value.startsWith("/") || /[?]/.test(value)) fail(label + " must be an internal path");
  const pathname = value.split("#", 1)[0] || "/";
  if (pathname !== "/") routePath(pathname, label);
  return value;
}
function wordRange(value, label) {
  if (Array.isArray(value) && value.length === 2) value = { min: value[0], max: value[1] };
  if (!value || typeof value !== "object" || !Number.isInteger(value.min) || !Number.isInteger(value.max) || value.min < 1 || value.max < value.min) fail(label + " must contain integer min/max word bounds");
  return { min: value.min, max: value.max };
}
function wordCount(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
}
function enforceWordRange(value, range, label) {
  const count = wordCount(value);
  if (count < range.min || count > range.max) fail(label + " word count " + count + " is outside declared range " + range.min + "-" + range.max);
  return count;
}
function contentParagraphs(value, label) {
  if (!Array.isArray(value) || value.length === 0) fail(label + " must be a non-empty array of paragraphs");
  value.forEach((paragraph, index) => nonEmpty(paragraph, label + "[" + index + "]"));
  return value;
}
function contentSections(value, label) {
  if (!Array.isArray(value) || value.length === 0) fail(label + " must be a non-empty array");
  value.forEach((section, index) => {
    if (!section || typeof section !== "object" || Array.isArray(section)) fail(label + "[" + index + "] must be an object");
    nonEmpty(section.heading, label + "[" + index + "].heading");
    contentParagraphs(section.paragraphs, label + "[" + index + "].paragraphs");
  });
  return value;
}
function validateEditorialContent() {
  if (!Array.isArray(locationPages) || locationPages.length === 0) fail("locationPages must be a non-empty array");
  if (!journalPage || typeof journalPage !== "object" || Array.isArray(journalPage)) fail("journalPage must be an object");
  if (!Array.isArray(guides) || guides.length === 0) fail("guides must be a non-empty array");
  if (!brandIntroductions || typeof brandIntroductions !== "object" || Array.isArray(brandIntroductions)) fail("brandIntroductions must be an object");
  const records = [];
  locationPages.forEach((page, index) => {
    if (!page || typeof page !== "object" || Array.isArray(page)) fail("locationPages[" + index + "] must be an object");
    for (const field of ["path", "title", "description", "eyebrow", "h1", "intro"]) nonEmpty(page[field], "locationPages[" + index + "]." + field);
    routePath(page.path, "locationPages[" + index + "].path");
    contentSections(page.sections, "locationPages[" + index + "].sections");
    const cta = typeof page.cta === "string" ? { label: page.cta, href: "/sourcing" } : page.cta;
    if (!cta || typeof cta !== "object" || Array.isArray(cta)) fail("locationPages[" + index + "].cta must be an object or string");
    nonEmpty(cta.label, "locationPages[" + index + "].cta.label");
    ctaPath(cta.href, "locationPages[" + index + "].cta.href");
    if (!Array.isArray(page.areaServed) || page.areaServed.length === 0) fail("locationPages[" + index + "].areaServed must be a non-empty array");
    page.areaServed.forEach((area, areaIndex) => nonEmpty(area, "locationPages[" + index + "].areaServed[" + areaIndex + "]"));
    page.wordRange = wordRange(page.wordRange, "locationPages[" + index + "].wordRange");
    enforceWordRange([page.intro, ...page.sections.flatMap((section) => section.paragraphs)].join(" "), page.wordRange, "locationPages[" + index + "]");
    records.push(page);
  });
  for (const field of ["path", "title", "description", "eyebrow", "h1", "intro"]) nonEmpty(journalPage[field], "journalPage." + field);
  routePath(journalPage.path, "journalPage.path");
  records.push(journalPage);
  guides.forEach((guide, index) => {
    if (!guide || typeof guide !== "object" || Array.isArray(guide)) fail("guides[" + index + "] must be an object");
    for (const field of ["path", "title", "description", "eyebrow", "h1", "summary"]) nonEmpty(guide[field], "guides[" + index + "]." + field);
    routePath(guide.path, "guides[" + index + "].path");
    isoDate(guide.datePublished, "guides[" + index + "].datePublished");
    isoDate(guide.dateModified, "guides[" + index + "].dateModified");
    if (guide.dateModified < guide.datePublished) fail("guides[" + index + "].dateModified must not precede datePublished");
    contentSections(guide.sections, "guides[" + index + "].sections");
    if (!Array.isArray(guide.relatedPaths)) fail("guides[" + index + "].relatedPaths must be an array");
    guide.relatedPaths.forEach((related, relatedIndex) => routePath(related, "guides[" + index + "].relatedPaths[" + relatedIndex + "]"));
    guide.wordRange = wordRange(guide.wordRange, "guides[" + index + "].wordRange");
    enforceWordRange([guide.summary, ...guide.sections.flatMap((section) => section.paragraphs)].join(" "), guide.wordRange, "guides[" + index + "]");
    records.push(guide);
  });
  const keys = Object.keys(brandIntroductions).sort();
  if (keys.join("\n") !== REQUIRED_BRAND_SLUGS.slice().sort().join("\n")) fail("brandIntroductions must contain exactly the four approved brand slugs");
  for (const slug of REQUIRED_BRAND_SLUGS) {
    const intro = brandIntroductions[slug];
    if (!intro || typeof intro !== "object" || Array.isArray(intro)) fail("brandIntroductions." + slug + " must be an object");
    nonEmpty(intro.heading, "brandIntroductions." + slug + ".heading");
    contentParagraphs(intro.paragraphs, "brandIntroductions." + slug + ".paragraphs");
    enforceWordRange(intro.paragraphs.join(" "), { min: 180, max: 250 }, "brandIntroductions." + slug);
  }
  const paths = [...FIXED_PAGE_ROUTES, ...records.map((record) => record.path)];
  const seen = new Set();
  for (const route of paths) {
    if (route !== "/") routePath(route, "content route");
    if (seen.has(route)) fail("duplicate editorial route: " + route);
    seen.add(route);
  }
  for (const guide of guides) for (const related of guide.relatedPaths) if (!seen.has(related)) fail("guides relatedPaths references an unknown route: " + related);
  return { locationPages, journalPage, guides, brandIntroductions };
}
function validateSite(site, root = ROOT) {
  for (const key of ["name", "legalName", "email", "phone", "location", "companyNumber", "vatNumber", "origin"]) nonEmpty(site[key], "site." + key);
  if (site.origin !== ORIGIN || /\/$/.test(site.origin)) fail("site.origin must be exactly " + ORIGIN);
  if (site.location !== "Limassol CY" || site.companyNumber !== "HE 492185" || site.vatNumber !== "60359894D" || site.email !== "info@chronotomi.com" || site.phone !== "+35799426514") fail("site business facts do not match the approved contract");
  if (!Array.isArray(site.areaServed) || site.areaServed.length === 0) fail("site.areaServed must be a non-empty array");
  const expectedSocials = {
    trustpilot: "https://www.trustpilot.com/review/chronotomi.com",
    instagram: "https://www.instagram.com/chronotomi.wealth?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    facebook: "https://www.facebook.com/share/1Ba8A5m4Wp/"
  };
  if (!site.socialProfiles || typeof site.socialProfiles !== "object") fail("site.socialProfiles is required");
  for (const key of Object.keys(expectedSocials)) if (site.socialProfiles[key] !== expectedSocials[key]) fail("site.socialProfiles." + key + " must preserve the existing URL");
  if (!site.socialDefaults || typeof site.socialDefaults !== "object") fail("site.socialDefaults is required");
  nonEmpty(site.socialDefaults.image, "site.socialDefaults.image");
  nonEmpty(site.socialDefaults.imageAlt, "site.socialDefaults.imageAlt");
  if (!site.socialDefaults.image.startsWith("/assets/") || !fs.existsSync(path.join(root, site.socialDefaults.image.slice(1)))) fail("site.socialDefaults.image must reference an existing /assets file");
  if (!site.pages || typeof site.pages !== "object" || Array.isArray(site.pages)) fail("site.pages is required");
  const configuredRoutes = Object.keys(site.pages).sort();
  const expectedRoutes = [...FIXED_PAGE_ROUTES].sort();
  if (configuredRoutes.join("\n") !== expectedRoutes.join("\n")) fail("site.pages must contain exactly: " + FIXED_PAGE_ROUTES.join(", "));
  const titles = new Set(), descriptions = new Set();
  for (const route of FIXED_PAGE_ROUTES) {
    const page = site.pages[route];
    if (!page || typeof page !== "object" || Array.isArray(page)) fail("site.pages[" + route + "] must be an object");
    nonEmpty(page.title, "site.pages[" + route + "].title");
    nonEmpty(page.description, "site.pages[" + route + "].description");
    const titleKey = page.title.trim().toLowerCase(), descriptionKey = page.description.trim().toLowerCase();
    if (titles.has(titleKey)) fail("site.pages contains duplicate title: " + page.title);
    if (descriptions.has(descriptionKey)) fail("site.pages contains duplicate description: " + page.description);
    titles.add(titleKey); descriptions.add(descriptionKey);
  }
  return site;
}
function imagePath(root, src, label) {
  nonEmpty(src, label + ".src");
  if (/^(?:[a-z]+:)?\/\//i.test(src) || src.includes("?") || src.includes("#") || src.includes("..")) fail(label + ".src must be a local query-free path");
  const resolved = path.resolve(root, src);
  if (!resolved.startsWith(path.join(root, "assets") + path.sep) || !fs.existsSync(resolved)) fail(label + ".src is missing locally: " + src);
}
export function loadCatalog(root = ROOT) {
  const records = readJson(path.join(root, "watches.json"));
  if (!Array.isArray(records) || records.length === 0) fail("watches.json must contain a non-empty array");
  const ids = new Set(), slugs = new Set(), refs = new Map(), summaries = new Set();
  const forbidden = ["price", "offers", "offer", "availability", "review", "reviews", "aggregateRating", "rating"];
  records.forEach((watch, index) => {
    const label = "watches[" + index + "]";
    if (!watch || typeof watch !== "object" || Array.isArray(watch)) fail(label + " must be an object");
    for (const key of forbidden) if (key in watch) fail(label + " contains forbidden key " + key);
    for (const key of ["id", "slug", "brand", "brandSlug", "model", "reference", "caseSize", "set"]) nonEmpty(watch[key], label + "." + key);
    if (watch.brandSlug !== slugify(watch.brand)) fail(label + ".brandSlug does not match brand");
    if (ids.has(watch.id)) fail("duplicate watch id: " + watch.id);
    if (slugs.has(watch.slug)) fail("duplicate watch slug: " + watch.slug);
    const refKey = watch.brandSlug + "::" + watch.reference.toLowerCase();
    if (refs.has(refKey)) {
      const existing = refs.get(refKey);
      if (existing.some((prev) => prev.id === watch.id || prev.slug === watch.slug)) {
        fail("duplicate brand+reference with conflicting id or slug: " + watch.brand + " " + watch.reference);
      }
      existing.push({ id: watch.id, slug: watch.slug });
    } else {
      refs.set(refKey, [{ id: watch.id, slug: watch.slug }]);
    }
    ids.add(watch.id); slugs.add(watch.slug);
    if (!Array.isArray(watch.images) || !watch.images.length) fail(label + ".images must be non-empty");
    watch.images.forEach((image, imageIndex) => {
      const imageLabel = label + ".images[" + imageIndex + "]";
      if (!image || typeof image !== "object") fail(imageLabel + " must be an object");
      imagePath(root, image.src, imageLabel);
      nonEmpty(image.alt, imageLabel + ".alt");
      if (!Number.isInteger(image.width) || image.width < 1 || !Number.isInteger(image.height) || image.height < 1) fail(imageLabel + " dimensions must be positive integers");
    });
    if (watch.indexable !== true && watch.indexable !== false) fail(label + ".indexable must be boolean");
    if (watch.indexable) {
      nonEmpty(watch.summary, label + ".summary");
      if (summaries.has(watch.summary)) fail("indexable summary must be unique: " + watch.summary);
      summaries.add(watch.summary);
      isoDate(watch.dateModified, label + ".dateModified");
    }
  });
  return records;
}
function makeRoute(origin, pathname, type, data) {
  if (pathname !== "/" && (!pathname.startsWith("/") || /\/$/.test(pathname))) fail("invalid route path: " + pathname);
  return Object.assign({ path: pathname, canonical: pathname === "/" ? origin + "/" : origin + pathname, type: type }, data || {});
}
export function buildRouteManifest(catalog, options = {}) {
  const origin = options.origin || ORIGIN;
  const pageMap = options.pageMap || {};
  const brands = Array.from(new Map(catalog.map(function(watch) { return [watch.brandSlug, { slug: watch.brandSlug, name: watch.brand }]; })).values());
  const routes = [
    makeRoute(origin, "/", "home"),
    ...STATIC_ROUTES.map(function(entry) { return makeRoute(origin, entry[0], "static", { source: entry[1] }); }),
    makeRoute(origin, "/watches", "catalog"),
    ...brands.map(function(brand) { return makeRoute(origin, "/watches/" + brand.slug, "brand", { brand: brand }); }),
    ...catalog.map(function(watch) { return makeRoute(origin, "/watches/" + watch.brandSlug + "/" + watch.slug, "watch", { watch: watch }); }),
    makeRoute(origin, "/sourcing", "service", { service: "sourcing" }),
    makeRoute(origin, "/authenticity", "service", { service: "authenticity" }),
    ...locationPages.map((page) => makeRoute(origin, page.path, "location", { page })),
    makeRoute(origin, journalPage.path, "journal", { page: journalPage }),
    ...guides.map((guide) => makeRoute(origin, guide.path, "guide", { page: guide }))
  ];
  const paths = new Set();
  for (const entry of routes) {
    if (paths.has(entry.path)) fail("duplicate generated route: " + entry.path);
    if (entry.canonical !== (entry.path === "/" ? origin + "/" : origin + entry.path)) fail("canonical mismatch for " + entry.path);
    paths.add(entry.path);
  }
  const titles = new Set(), descriptions = new Set();
  for (const entry of routes) {
    const page = entry.page || pageMap[entry.path];
    const title = page?.title || (entry.type === "brand" ? entry.brand.name + " Watches | Chronotomi Wealth" : entry.type === "watch" ? watchTitle(entry.watch) : null);
    const description = page?.description || (entry.type === "brand" ? "Explore the curated Chronotomi Wealth selection of " + entry.brand.name + " references." : entry.type === "watch" ? entry.watch.summary : null);
    if (title && titles.has(title.trim().toLowerCase())) fail("duplicate generated title: " + title);
    if (description && descriptions.has(description.trim().toLowerCase())) fail("duplicate generated description: " + description);
    if (title) titles.add(title.trim().toLowerCase());
    if (description) descriptions.add(description.trim().toLowerCase());
  }
  return routes;
}
function segments(pathname) { return pathname === "/" ? [] : pathname.slice(1).split("/"); }
function assetHref(pathname, source) { return "../".repeat(segments(pathname).length) + source; }
function jsonLd(value) { return JSON.stringify(value).replaceAll("<", "\\u003c"); }

function responsiveAssetPath(source, suffix, extension) {
  const currentExtension = path.extname(source);
  if (!currentExtension) fail("responsive image source has no extension: " + source);
  return source.slice(0, -currentExtension.length) + suffix + "." + extension;
}
function responsiveCandidates(root, image, pathname, extension) {
  const candidates = [
    { source: responsiveAssetPath(image.src, "-400", extension), width: 400 },
    { source: responsiveAssetPath(image.src, "-800", extension), width: 800 },
    { source: responsiveAssetPath(image.src, "", extension), width: image.width }
  ];
  const byWidth = new Map();
  for (const candidate of candidates) {
    const resolved = path.resolve(root, candidate.source);
    if (!resolved.startsWith(path.join(root, "assets") + path.sep)) fail("responsive asset escapes assets/: " + candidate.source);
    if (!fs.existsSync(resolved)) continue;
    if (!fs.statSync(resolved).isFile()) fail("responsive asset is not a file: " + candidate.source);
    byWidth.set(candidate.width, candidate);
  }
  return [...byWidth.values()].sort(function(a, b) { return a.width - b.width; }).map(function(candidate) { return esc(assetHref(pathname, candidate.source)) + " " + candidate.width + "w"; });
}
function responsivePicture(root, image, pathname, sizes, options = {}) {
  const avif = responsiveCandidates(root, image, pathname, "avif");
  const webp = responsiveCandidates(root, image, pathname, "webp");
  const fallbackExtension = path.extname(image.src).slice(1).toLowerCase();
  const fallback = responsiveCandidates(root, image, pathname, fallbackExtension);
  if (!fallback.length) fail("responsive fallback is missing for " + image.src);
  const imgAttributes = [
    'src="' + esc(assetHref(pathname, image.src)) + '"',
    'srcset="' + fallback.join(", ") + '"',
    'sizes="' + esc(sizes) + '"',
    'alt="' + esc(image.alt) + '"',
    'width="' + image.width + '"',
    'height="' + image.height + '"'
  ];
  if (options.loading) imgAttributes.push('loading="' + esc(options.loading) + '"');
  if (options.decoding) imgAttributes.push('decoding="' + esc(options.decoding) + '"');
  if (options.fetchpriority) imgAttributes.push('fetchpriority="' + esc(options.fetchpriority) + '"');
  return [
    "<picture>",
    avif.length ? '<source type="image/avif" srcset="' + avif.join(", ") + '" sizes="' + esc(sizes) + '" />' : "",
    webp.length ? '<source type="image/webp" srcset="' + webp.join(", ") + '" sizes="' + esc(sizes) + '" />' : "",
    "<img " + imgAttributes.join(" ") + " />",
    "</picture>"
  ].filter(Boolean).join("\n");
}

function card(watch, pathname, root) {
  const image = watch.images[0];
  const detail = "/watches/" + watch.brandSlug + "/" + watch.slug;
  return [
    '        <article class="inventory-card reveal" data-id="' + esc(watch.id) + '" data-brand="' + esc(watch.brand) + '" data-model="' + esc(watch.model) + '" data-size="' + esc(watch.caseSize) + '" style="position: relative; overflow: hidden;">',
    '          <div class="inventory-image" style="position: relative; z-index: 1;">' + responsivePicture(root, image, pathname, CARD_IMAGE_SIZES, { loading: "lazy", decoding: "async" }) + "</div>",
    '          <div style="padding: 0 2rem 3rem;">',
    '            <a class="inventory-detail-anchor" href="' + detail + '" aria-label="View ' + esc(watch.brand + " " + watch.model + " reference " + watch.reference) + ' details">',
    '              <span class="inventory-brand text-mask"><span class="text-mask-inner">' + esc(watch.brand) + '</span></span>',
    '              <div class="inventory-copy"><span class="eyebrow text-mask" style="margin-bottom: 0.5rem; letter-spacing: 0.1em; color: var(--text);"><span class="text-mask-inner delay-1">' + esc(watch.reference) + '</span></span>',
    '                <h3><span class="text-mask"><span class="text-mask-inner delay-2">' + esc(watch.model) + '</span></span></h3></div>',
    '            </a>',
    '            <div class="inventory-specs" style="margin-bottom: 3rem;"><span>' + esc(watch.caseSize) + '</span></div>',
    '            <div class="inventory-actions" style="display: flex; flex-direction: column; gap: .75rem;">',
    '              <button class="btn-primary js-select-watch" type="button" data-watch="' + esc(watch.brand + " " + watch.model) + '" data-reference="' + esc(watch.reference) + '" data-id="' + esc(watch.id) + '" style="width: 100%;">Inquire</button>',
    '            </div></div></article>'
  ].join("\n");
}
function cards(catalog, pathname, brandSlug, root) {
  return catalog.filter(function(watch) { return !brandSlug || watch.brandSlug === brandSlug; }).map(function(watch) { return card(watch, pathname, root); }).join("\n");
}
function organization(site) {
  return {
    "@type": "Organization", "@id": site.origin + "/#organization", name: site.name, legalName: site.legalName,
    url: site.origin + "/", logo: { "@type": "ImageObject", url: site.origin + site.socialDefaults.image, contentUrl: site.origin + site.socialDefaults.image, caption: site.socialDefaults.imageAlt },
    email: site.email, telephone: site.phone,
    address: { "@type": "PostalAddress", addressLocality: site.address.addressLocality, addressCountry: site.address.addressCountry },
    areaServed: site.areaServed,
    identifier: [
      { "@type": "PropertyValue", propertyID: "Company Number", value: site.companyNumber },
      { "@type": "PropertyValue", propertyID: "VAT Number", value: site.vatNumber }
    ],
    sameAs: Object.values(site.socialProfiles)
  };
}
function breadcrumbList(site, items) {
  return { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: site.origin + "/" }].concat(items.map(function(item, index) { return { "@type": "ListItem", position: index + 2, name: item.name, item: item.url }; })) };
}
function schemaGraph(nodes) {
  return { "@context": "https://schema.org", "@graph": nodes };
}
function aboutSchema(site) {
  const canonical = site.origin + "/about";
  const page = site.pages["/about"];
  return schemaGraph([
    organization(site),
    { "@type": "AboutPage", "@id": canonical + "#webpage", name: page.title, description: page.description, url: canonical, mainEntity: { "@id": site.origin + "/#organization" }, about: { "@id": site.origin + "/#organization" } }
  ]);
}
function websiteSchema(site) {
  return { "@type": "WebSite", "@id": site.origin + "/#website", name: "Chronotomi", alternateName: "Chronotomi Wealth", url: site.origin + "/", publisher: { "@id": site.origin + "/#organization" }, inLanguage: "en-CY" };
}
function homepageSchema(site) {
  const page = site.pages["/"];
  return schemaGraph([
    organization(site), websiteSchema(site),
    { "@type": "WebPage", "@id": site.origin + "/#webpage", name: page.title, description: page.description, url: site.origin + "/", isPartOf: { "@id": site.origin + "/#website" } }
  ]);
}
function serviceSchema(site, data) {
  return schemaGraph([
    organization(site),
    { "@type": "Service", "@id": data.canonical + "#service", name: data.name, serviceType: data.serviceType, description: data.description, url: data.canonical, provider: { "@id": site.origin + "/#organization" }, areaServed: site.areaServed },
    breadcrumbList(site, [{ name: data.breadcrumbName || data.name, url: data.canonical }])
  ]);
}
function replaceJsonLd(html, schema, label) {
  const withoutExisting = html.replace(/\s*<script\b(?=[^>]*\btype\s*=\s*["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  if (!/<\/head\s*>/i.test(withoutExisting)) fail(label + " is missing </head> for JSON-LD injection");
  return withoutExisting.replace(/<\/head\s*>/i, '  <script type="application/ld+json">' + jsonLd(schema) + "</script>\n</head>");
}
function replaceFixedHeadMetadata(html, site, route, label) {
  const page = site.pages[route];
  const canonical = route === "/" ? site.origin + "/" : site.origin + route;
  const socialImage = site.origin + site.socialDefaults.image;
  const selectors = [
    ["meta", "name", "description"],
    ["link", "rel", "canonical"],
    ["meta", "property", "og:title"],
    ["meta", "property", "og:description"],
    ["meta", "property", "og:url"],
    ["meta", "property", "og:image"],
    ["meta", "property", "og:image:alt"],
    ["meta", "name", "twitter:card"],
    ["meta", "name", "twitter:title"],
    ["meta", "name", "twitter:description"],
    ["meta", "name", "twitter:image"],
    ["meta", "name", "twitter:image:alt"]
  ];
  let updated = html.replace(/\s*<title\b[^>]*>[\s\S]*?<\/title\s*>/gi, "");
  for (const selector of selectors) {
    const pattern = new RegExp("\\s*<" + selector[0] + "\\b(?=[^>]*\\b" + selector[1] + "\\s*=\\s*[\\\"']" + selector[2].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\\"'])[^>]*>", "gi");
    updated = updated.replace(pattern, "");
  }
  const block = [
    '  <meta name="description" content="' + esc(page.description) + '" />',
    '  <link rel="canonical" href="' + esc(canonical) + '" />',
    '  <meta property="og:title" content="' + esc(page.title) + '" />',
    '  <meta property="og:description" content="' + esc(page.description) + '" />',
    '  <meta property="og:url" content="' + esc(canonical) + '" />',
    '  <meta property="og:image" content="' + esc(socialImage) + '" />',
    '  <meta property="og:image:alt" content="' + esc(site.socialDefaults.imageAlt) + '" />',
    '  <meta name="twitter:card" content="summary_large_image" />',
    '  <meta name="twitter:title" content="' + esc(page.title) + '" />',
    '  <meta name="twitter:description" content="' + esc(page.description) + '" />',
    '  <meta name="twitter:image" content="' + esc(socialImage) + '" />',
    '  <meta name="twitter:image:alt" content="' + esc(site.socialDefaults.imageAlt) + '" />',
    "  <title>" + esc(page.title) + "</title>"
  ].join("\n");
  const viewport = /<meta\b(?=[^>]*\bname\s*=\s*["']viewport["'])[^>]*>/i;
  if (!viewport.test(updated)) fail(label + " is missing viewport metadata injection target");
  return updated.replace(viewport, function(match) { return match + "\n" + block; });
}
function head(title, description, canonical, schema, site, socialImagePath = site.socialDefaults.image) {
  const pathname = new URL(canonical).pathname, prefix = assetHref(pathname, "");
  const socialPath = "/" + String(socialImagePath).replace(/^\/+/, "");
  const socialImage = site.origin + socialPath;
  return [
    "<!doctype html><html lang=\"en\"><head><meta charset=\"UTF-8\" />",
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    "<title>" + esc(title) + "</title><meta name=\"description\" content=\"" + esc(description) + "\" />",
    '<link rel="canonical" href="' + esc(canonical) + '" /><meta property="og:type" content="website" />',
    '<meta property="og:title" content="' + esc(title) + '" /><meta property="og:description" content="' + esc(description) + '" /><meta property="og:url" content="' + esc(canonical) + '" /><meta property="og:image" content="' + esc(socialImage) + '" /><meta property="og:image:alt" content="' + esc(site.socialDefaults.imageAlt) + '" />',
    '<meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="' + esc(title) + '" /><meta name="twitter:description" content="' + esc(description) + '" /><meta name="twitter:image" content="' + esc(socialImage) + '" /><meta name="twitter:image:alt" content="' + esc(site.socialDefaults.imageAlt) + '" />',
    '<link rel="preconnect" href="https://fonts.googleapis.com" />',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" />',
    '<link rel="stylesheet" href="' + prefix + 'styles.css?v=70" />',
    '<link rel="icon" type="image/png" sizes="32x32" href="' + prefix + 'assets/favicon-32x32.png?v=4" />',
    '<link rel="icon" type="image/png" sizes="48x48" href="' + prefix + 'assets/favicon-48x48.png?v=4" />',
    '<link rel="icon" type="image/png" sizes="192x192" href="' + prefix + 'assets/favicon-192x192.png?v=4" />',
    '<link rel="icon" type="image/png" sizes="512x512" href="' + prefix + 'assets/favicon.png?v=4" />',
    '<link rel="apple-touch-icon" href="' + prefix + 'assets/apple-touch-icon.png?v=4" />',
    '<script src="' + prefix + 'script.js?v=61" defer></script>',
    "<style>.seo-page{min-height:100vh;padding:10rem 5vw 6rem;max-width:1400px;margin:0 auto}.seo-hero{max-width:820px;margin:0 auto 3rem;text-align:center;display:flex;flex-direction:column;align-items:center}.seo-hero h1{font-family:var(--font-display);font-size:clamp(2.5rem,5vw,4rem);font-weight:400;line-height:1.15;margin:0 0 1.5rem;color:var(--text)}.seo-hero .lede{color:var(--muted);font-size:1.1rem;line-height:1.8;max-width:680px;margin:0 auto 2rem}.seo-links{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:1rem}.seo-grid{margin-top:4rem}.seo-detail-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:clamp(2.5rem,6vw,6rem);align-items:start;max-width:1200px;margin:0 auto}.seo-detail-image{width:100%;background:var(--bg-soft);border:1px solid var(--line);overflow:hidden;margin:0}.seo-detail-image img{display:block;width:100%;height:auto}.seo-detail-info{display:flex;flex-direction:column}.seo-detail-info h1{font-family:var(--font-display);font-size:clamp(2.2rem,4vw,3.5rem);font-weight:400;line-height:1.15;margin:0 0 1rem}.seo-detail-info .lede{color:var(--muted);font-size:1.05rem;line-height:1.7;margin:0 0 2rem}.facts{border-top:1px solid var(--line);margin:0 0 2rem;padding:0}.fact{display:flex;justify-content:space-between;align-items:center;gap:2rem;padding:1.1rem 0;border-bottom:1px solid var(--line)}.fact dt{color:var(--muted);font-size:.8rem;letter-spacing:.15em;text-transform:uppercase}.fact dd{margin:0;text-align:right;font-weight:500;color:var(--text)}.gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;margin-top:1rem}.gallery picture{display:block;border:1px solid var(--line);overflow:hidden;background:var(--bg-soft)}.gallery img{display:block;width:100%;height:auto}.policy-section{max-width:820px;margin:5rem auto 0;padding-top:3.5rem;border-top:1px solid var(--line);text-align:center}.policy-section h2{font-family:var(--font-display);font-size:clamp(1.6rem,3vw,2.2rem);font-weight:400;margin:0 0 1.25rem}.policy-section p{color:var(--muted);line-height:1.8;font-size:1.05rem;margin:0}@media(max-width:800px){.seo-detail-grid{grid-template-columns:1fr}.seo-page{padding-top:7.5rem}.seo-links{flex-direction:column;width:100%}.seo-links .btn-primary,.seo-links .btn-outline{width:100%}}</style>",
    '<script type="application/ld+json">' + jsonLd(schema) + "</script></head><body>",
    '<header class="site-header" id="site-header"><a class="brand" href="/" aria-label="Chronotomi Wealth home">',
    '<picture><source type="image/avif" srcset="' + prefix + 'assets/logo_transparent.avif" /><source type="image/webp" srcset="' + prefix + 'assets/logo_transparent.webp" /><img class="brand-mark" src="' + prefix + 'assets/logo_transparent.png" alt="Chronotomi Wealth" /></picture>',
    '<span class="brand-copy"><strong>Chronotomi Wealth</strong><small>Your Time, Defined.</small></span></a><nav class="site-nav" aria-label="Primary">',
    '<button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation" aria-expanded="false"><span class="hamburger"></span></button><div class="nav-links">',
    '<a href="/watches">Timepieces</a><a href="/sourcing">Sourcing</a><a href="/authenticity">Authenticity</a><a href="/about">About Us</a>',
    "</div></nav></header>"
  ].join("\n");
}
function footer(site, pathname) {
  const prefix = assetHref(pathname, "");
  const cyprusRoute = locationPages.find((page) => /cyprus/i.test(page.path))?.path || "/luxury-watches-cyprus";
  const limassolRoute = locationPages.find((page) => /limassol/i.test(page.path))?.path || "/luxury-watches-limassol";
  return [
    '<footer class="site-footer" style="position:relative;overflow:hidden;background:#000;border-top:1px solid rgba(255,255,255,.05);">',
    '<img src="' + prefix + 'assets/logo_transparent.png" class="footer-watermark" aria-hidden="true" alt="" /><div class="footer-left"><strong>' + esc(site.name) + '</strong><br/><span>Your Time, Defined.</span><nav class="seo-footer-links" aria-label="Contextual links"><a href="' + esc(cyprusRoute) + '">Luxury watches in Cyprus</a><a href="' + esc(limassolRoute) + '">Luxury watches in Limassol</a><a href="' + esc(journalPage.path) + '">Journal</a><a href="/sourcing">Sourcing</a><a href="/watches">Watches</a></nav></div>',
    '<div class="footer-right"><div class="footer-socials"><a href="' + esc(site.socialProfiles.instagram) + '" rel="noreferrer" aria-label="Instagram">Instagram</a><a href="' + esc(site.socialProfiles.facebook) + '" rel="noreferrer" aria-label="Facebook">Facebook</a></div>',
    '<div class="footer-copyright">&copy; 2026 ' + esc(site.legalName) + '<br>COMPANY NUMBER: ' + esc(site.companyNumber) + '<br>VAT NUMBER: ' + esc(site.vatNumber) + '<br><br>Brought to life by <a href="https://qu4rk.github.io/QuarkMade/" target="_blank" rel="noopener noreferrer" class="quark-link"><span class="quark-shimmer" data-text="Quark">Quark</span></a>.</div></div></footer></body></html>'
  ].join("\n");
}
function ctaDetails(cta) {
  if (typeof cta === "string") return { label: cta, href: "/sourcing" };
  return cta || { label: "Begin a private sourcing conversation", href: "/sourcing" };
}
function sectionMarkup(sections) {
  return sections.map((section) => '<section class="seo-article__section"><h2>' + esc(section.heading) + '</h2>' + section.paragraphs.map((paragraph) => '<p>' + esc(paragraph) + '</p>').join("") + '</section>').join("\n");
}
function relatedMarkup(paths, site) {
  if (!paths?.length) return "";
  const links = paths.map((route) => {
    const target = [...locationPages, journalPage, ...guides].find((page) => page.path === route);
    return '<li><a href="' + esc(route) + '">' + esc(target?.h1 || target?.title || route) + '</a></li>';
  }).join("");
  return '<aside class="seo-related"><h2>Related reading</h2><ul>' + links + '</ul></aside>';
}
function locationSchema(site, page, canonical) {
  return schemaGraph([
    organization(site),
    { "@type": "WebPage", "@id": canonical + "#webpage", name: page.title, description: page.description, url: canonical, about: { "@id": site.origin + "/#organization" } },
    { "@type": "Service", "@id": canonical + "#service", name: page.h1, serviceType: "Private luxury watch sourcing", description: page.description, url: canonical, provider: { "@id": site.origin + "/#organization" }, areaServed: page.areaServed },
    breadcrumbList(site, [{ name: page.h1, url: canonical }])
  ]);
}
function journalSchema(site, page, canonical, guideEntries) {
  return schemaGraph([
    { "@type": "CollectionPage", "@id": canonical + "#collection", name: page.title, description: page.description, url: canonical, mainEntity: { "@type": "ItemList", numberOfItems: guideEntries.length, itemListElement: guideEntries.map((guide, index) => ({ "@type": "ListItem", position: index + 1, name: guide.h1, url: site.origin + guide.path })) } },
    breadcrumbList(site, [{ name: "Journal", url: canonical }])
  ]);
}
function guideSchema(site, guide, canonical) {
  return schemaGraph([
    organization(site),
    { "@type": "Article", "@id": canonical + "#article", headline: guide.h1, name: guide.title, description: guide.description, url: canonical, datePublished: guide.datePublished, dateModified: guide.dateModified, author: { "@id": site.origin + "/#organization" }, publisher: { "@id": site.origin + "/#organization" }, mainEntityOfPage: { "@id": canonical + "#article" } },
    breadcrumbList(site, [{ name: "Journal", url: site.origin + journalPage.path }, { name: guide.h1, url: canonical }])
  ]);
}
function editorialPage(page, type, site, canonical) {
  const location = type === "location";
  const cta = location ? ctaDetails(page.cta) : null;
  const body = location
    ? '<p class="seo-intro">' + esc(page.intro) + '</p><div class="seo-article__body">' + sectionMarkup(page.sections) + '</div><div class="seo-intro__links"><a class="btn-primary" href="' + esc(cta.href) + '">' + esc(cta.label) + '</a><a class="btn-outline" href="/watches">Explore watches</a><a class="btn-outline" href="' + esc(journalPage.path) + '">Read the Journal</a></div>'
    : '<p class="seo-intro">' + esc(page.intro || page.summary) + '</p>';
  return head(page.title, page.description, canonical, location ? locationSchema(site, page, canonical) : journalSchema(site, page, canonical, guides), site) +
    '<main class="seo-page"><article class="seo-article"><header class="seo-article__header"><span class="eyebrow">' + esc(page.eyebrow) + '</span><h1>' + esc(page.h1) + '</h1></header>' + body + '</article></main>' + footer(site, new URL(canonical).pathname);
}
function guidePage(guide, site, canonical) {
  return head(guide.title, guide.description, canonical, guideSchema(site, guide, canonical), site) +
    '<main class="seo-page"><article class="seo-article"><header class="seo-article__header"><span class="eyebrow">' + esc(guide.eyebrow) + '</span><h1>' + esc(guide.h1) + '</h1><p class="seo-intro">' + esc(guide.summary) + '</p><p class="seo-article__date"><time datetime="' + esc(guide.dateModified) + '">Updated ' + esc(guide.dateModified) + '</time></p></header><div class="seo-article__body">' + sectionMarkup(guide.sections) + '</div>' + relatedMarkup(guide.relatedPaths, site) + '</article></main>' + footer(site, new URL(canonical).pathname);
}
function journalPageHtml(page, site, canonical) {
  const cardsHtml = guides.map((guide) => '<article class="seo-related"><h2><a href="' + esc(guide.path) + '">' + esc(guide.h1) + '</a></h2><p>' + esc(guide.summary) + '</p><a class="btn-outline" href="' + esc(guide.path) + '">Read guide</a></article>').join("");
  return head(page.title, page.description, canonical, journalSchema(site, page, canonical, guides), site) +
    '<main class="seo-page"><article class="seo-article"><header class="seo-article__header"><span class="eyebrow">' + esc(page.eyebrow) + '</span><h1>' + esc(page.h1) + '</h1><p class="seo-intro">' + esc(page.intro) + '</p></header><div class="seo-article__body">' + cardsHtml + '</div></article></main>' + footer(site, new URL(canonical).pathname);
}
function rolexFilterPanel(isOpen = false) {
  const openClass = isOpen ? " is-open" : "";
  return [
    '      <div class="rolex-filter-panel' + openClass + '" id="rolex-filter-panel" aria-label="Rolex Model and Size Filters">',
    '        <div class="rolex-filter-inner">',
    '          <div class="filter-dropdown-wrapper">',
    '            <label for="rolex-model-select" class="subfilter-label">Model</label>',
    '            <div class="select-container">',
    '              <select id="rolex-model-select" class="luxury-select" aria-label="Filter by Rolex model">',
    '                <option value="All">All Models</option>',
    '                <option value="Air-King">Air-King</option>',
    '                <option value="Cosmograph Daytona">Cosmograph Daytona</option>',
    '                <option value="Datejust">Datejust</option>',
    '                <option value="Day-Date">Day-Date</option>',
    '                <option value="GMT-Master II">GMT-Master II</option>',
    '                <option value="Land-Dweller">Land-Dweller</option>',
    '                <option value="Oyster Perpetual">Oyster Perpetual</option>',
    '                <option value="Sky-Dweller">Sky-Dweller</option>',
    '                <option value="Submariner">Submariner</option>',
    '                <option value="Yacht-Master">Yacht-Master</option>',
    '              </select>',
    '              <svg class="select-chevron" width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    '            </div>',
    '          </div>',
    '          <div class="filter-dropdown-wrapper">',
    '            <label for="rolex-size-select" class="subfilter-label">Case Size</label>',
    '            <div class="select-container">',
    '              <select id="rolex-size-select" class="luxury-select" aria-label="Filter by Rolex case size">',
    '                <option value="All">All Sizes</option>',
    '                <option value="31mm">31mm</option>',
    '                <option value="34mm">34mm</option>',
    '                <option value="36mm">36mm</option>',
    '                <option value="40mm">40mm</option>',
    '                <option value="41mm">41mm</option>',
    '                <option value="42mm">42mm</option>',
    '                <option value="44mm">44mm</option>',
    '              </select>',
    '              <svg class="select-chevron" width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    '            </div>',
    '          </div>',
    '        </div>',
    '      </div>'
  ].join("\n");
}
function collectionPage(title, description, canonical, site, catalog, pathname, brand, root) {
  const shown = brand ? catalog.filter(function(watch) { return watch.brandSlug === brand.slug; }) : catalog;
  const heading = brand ? brand.name + " watches" : "Curated timepiece collection";
  const intro = brand ? "A private selection of " + brand.name + " references represented in the Chronotomi Wealth sourcing catalog." : "Explore the curated Chronotomi Wealth catalog by brand, reference, case size, and set presentation.";
  const schema = { "@context": "https://schema.org", "@type": "CollectionPage", name: title, url: canonical, description: description, mainEntity: { "@type": "ItemList", numberOfItems: shown.length, itemListElement: shown.map(function(watch, index) { return { "@type": "ListItem", position: index + 1, url: site.origin + "/watches/" + watch.brandSlug + "/" + watch.slug, name: watch.brand + " " + watch.model + " " + watch.reference }; }) } };
  const isRolex = Boolean(brand && brand.slug === "rolex");
  const rolexPanel = isRolex ? "\n" + rolexFilterPanel(true) : "";
  const emptyBlock = isRolex ? '\n        <div id="inventory-empty" class="inventory-empty" style="display: none;">\n          <h3>No matching timepieces found</h3>\n          <p>We source bespoke and rare Rolex references upon request.</p>\n          <a href="/sourcing" class="btn-primary">Request Private Sourcing</a>\n        </div>' : '';
  const brandIntro = brandIntroductions[brand?.slug];
  const brandIntroMarkup = brandIntro ? '<section class="seo-intro seo-brand-intro"><h2>' + esc(brandIntro.heading) + '</h2>' + brandIntro.paragraphs.map((paragraph) => '<p>' + esc(paragraph) + '</p>').join("") + '</section>' : '';
  return head(title, description, canonical, schema, site) +
    '<main class="seo-page">' +
    '<div class="seo-hero">' +
    '<span class="eyebrow">Chronotomi Wealth / Timepieces</span>' +
    '<h1>' + esc(heading) + '</h1>' +
    '<p class="lede">' + esc(intro) + '</p>' +
    '<div class="seo-links">' +
    (brand ? '<a class="btn-outline" href="/watches">All Timepieces</a>' : '') +
    '<a class="btn-primary" href="/sourcing">Private Sourcing</a>' +
    '<a class="btn-outline" href="/authenticity">Authenticity</a>' +
    '</div>' +
    '</div>' +
    brandIntroMarkup +
    '<section class="seo-grid">' +
    rolexPanel +
    '<div class="inventory-grid" id="inventory-grid">' +
    cards(shown, pathname, brand && brand.slug, root) +
    emptyBlock +
    '</div>' +
    '</section>' +
    '</main>' +
    footer(site, pathname);
}
function watchTitle(watch) {
  const baseSlug = slugify(watch.model + " " + watch.reference);
  let suffix = "";
  if (watch.slug.startsWith(baseSlug + "-")) {
    const extra = watch.slug.slice(baseSlug.length + 1);
    suffix = " " + extra.split("-").map(function(w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(" ");
  }
  return watch.brand + " " + watch.model + " " + watch.reference + suffix + " | Chronotomi Wealth";
}
function watchPage(watch, site, canonical, pathname, root) {
  const image = watch.images[0];
  const productName = watch.brand + " " + watch.model + " " + watch.reference;
  const schema = schemaGraph([
    { "@type": "Product", "@id": canonical + "#product", name: productName, description: watch.summary, sku: watch.reference, url: canonical, image: [site.origin + "/" + image.src], brand: { "@type": "Brand", name: watch.brand }, additionalProperty: [{ "@type": "PropertyValue", name: "Reference", value: watch.reference }, { "@type": "PropertyValue", name: "Case size", value: watch.caseSize }, { "@type": "PropertyValue", name: "Set", value: watch.set }] },
    breadcrumbList(site, [{ name: "Watches", url: site.origin + "/watches" }, { name: watch.brand, url: site.origin + "/watches/" + watch.brandSlug }, { name: watch.model + " " + watch.reference, url: canonical }])
  ]);
  const gallery = watch.images.slice(1).map(function(item) { return responsivePicture(root, item, pathname, GALLERY_IMAGE_SIZES, { loading: "lazy", decoding: "async" }); }).join("");
  const inquiryHref = "/?watch=" + encodeURIComponent(watch.id) + "#inquire";
  return head(watchTitle(watch), watch.summary, canonical, schema, site, image.src) +
    '<main class="seo-page">' +
    '<div class="seo-detail-grid">' +
    '<div>' +
    '<figure class="seo-detail-image">' +
    responsivePicture(root, image, pathname, DETAIL_IMAGE_SIZES, { fetchpriority: "high" }) +
    '</figure>' +
    (gallery ? '<div class="gallery">' + gallery + '</div>' : '') +
    '</div>' +
    '<article class="seo-detail-info">' +
    '<span class="eyebrow">' + esc(watch.brand) + '</span>' +
    '<h1>' + esc(productName) + '</h1>' +
    '<p class="lede">' + esc(watch.summary) + '</p>' +
    '<dl class="facts">' +
    '<div class="fact"><dt>Reference</dt><dd>' + esc(watch.reference) + '</dd></div>' +
    '<div class="fact"><dt>Case size</dt><dd>' + esc(watch.caseSize) + '</dd></div>' +
    '<div class="fact"><dt>Set</dt><dd>' + esc(watch.set) + '</dd></div>' +
    '</dl>' +
    '<p class="lede" style="font-size:0.95rem;color:var(--muted);margin-bottom:2rem;">Chronotomi Wealth handles timepiece conversations privately, with sourcing context and next steps discussed directly with each client.</p>' +
    '<div class="seo-links" style="justify-content:flex-start;">' +
    '<a class="btn-primary" href="' + esc(inquiryHref) + '">Inquire privately</a>' +
    '<a class="btn-outline" href="/sourcing">Sourcing context</a>' +
    '<a class="btn-outline" href="/authenticity">Authenticity</a>' +
    '<a class="btn-outline" href="/logistics">Logistics</a>' +
    '</div>' +
    '</article>' +
    '</div>' +
    '</main>' +
    footer(site, pathname);
}
function servicePage(kind, site, canonical, pathname) {
  const sourcing = kind === "sourcing";
  const page = site.pages[pathname];
  const title = page.title;
  const description = page.description;
  const heading = sourcing ? "Private sourcing" : "Authenticity, handled privately";
  const copy = sourcing ? "Share the reference, brand, or specification you have in mind and Chronotomi Wealth will outline the next conversation privately." : "Each timepiece conversation includes a direct discussion of the catalog facts, documentation, and next steps relevant to the reference.";
  const schema = serviceSchema(site, { canonical: canonical, name: heading, serviceType: sourcing ? "Private luxury timepiece sourcing" : "Luxury timepiece authenticity conversations", description: description, breadcrumbName: sourcing ? "Sourcing" : "Authenticity" });
  const primaryHref = sourcing ? "/#source" : "/#inquire";
  const subHeading = sourcing ? "A discreet first step" : "A direct, reference-led conversation";
  const bodyCopy = sourcing ? "Include the brand, model, reference, case size, and set details that matter to you. The current catalog provides the visible facts used to begin that conversation." : "The visible catalog records identify the brand, model, reference, case size, set presentation, and image sources for each indexable record. Further documentation and logistics questions are discussed directly.";
  return head(title, description, canonical, schema, site) +
    '<main class="seo-page">' +
    '<div class="seo-hero">' +
    '<span class="eyebrow">Chronotomi Wealth / ' + (sourcing ? "Sourcing" : "Authenticity") + '</span>' +
    '<h1>' + esc(heading) + '</h1>' +
    '<p class="lede">' + esc(copy) + '</p>' +
    '<div class="seo-links">' +
    '<a class="btn-primary" href="' + primaryHref + '">' + (sourcing ? "Start an inquiry" : "Inquire privately") + '</a>' +
    '<a class="btn-outline" href="/watches">View Collection</a>' +
    '<a class="btn-outline" href="' + (sourcing ? "/authenticity" : "/sourcing") + '">' + (sourcing ? "Authenticity" : "Sourcing") + '</a>' +
    '<a class="btn-outline" href="/logistics">Logistics</a>' +
    '</div>' +
    '</div>' +
    '<section class="policy-section">' +
    '<h2>' + esc(subHeading) + '</h2>' +
    '<p>' + esc(bodyCopy) + '</p>' +
    '</section>' +
    '</main>' +
    footer(site, pathname);
}
function injectHomepage(html, catalog, root) {
  const pattern = /(<div class="inventory-grid" id="inventory-grid" aria-live="polite">)[\s\S]*?(<\/div>)/;
  if (!pattern.test(html)) fail("index.html is missing the inventory-grid injection target");
  const emptyBlock = '\n        <div id="inventory-empty" class="inventory-empty" style="display: none;">\n          <h3>No matching timepieces found</h3>\n          <p>We source bespoke and rare Rolex references upon request.</p>\n          <a href="#source" class="btn-primary">Request Private Sourcing</a>\n        </div>';
  const injected = html.replace(pattern, function(_match, opening, closing) { return opening + "\n" + cards(catalog, "/", "", root) + emptyBlock + "\n      " + closing; });
  return injected;
}
function renderRoute(entry, catalog, site, root) {
  if (entry.type === "catalog") return collectionPage(site.pages["/watches"].title, site.pages["/watches"].description, entry.canonical, site, catalog, entry.path, undefined, root);
  if (entry.type === "brand") return collectionPage(entry.brand.name + " Watches | Chronotomi Wealth", "Explore the curated Chronotomi Wealth selection of " + entry.brand.name + " references.", entry.canonical, site, catalog, entry.path, entry.brand, root);
  if (entry.type === "watch") return watchPage(entry.watch, site, entry.canonical, entry.path, root);
  if (entry.type === "location") return editorialPage(entry.page, entry.type, site, entry.canonical);
  if (entry.type === "journal") return journalPageHtml(entry.page, site, entry.canonical);
  if (entry.type === "guide") return guidePage(entry.page, site, entry.canonical);
  return servicePage(entry.service, site, entry.canonical, entry.path);
}
function copyPublic(root) {
  const dist = path.join(root, "dist");
  for (const file of HTML_PAGES) fs.copyFileSync(path.join(root, file), path.join(dist, file));
  fs.copyFileSync(path.join(root, "404.html"), path.join(dist, "404.html"));
  for (const file of PUBLIC_FILES) fs.copyFileSync(path.join(root, file), path.join(dist, file));
  fs.cpSync(path.join(root, "assets"), path.join(dist, "assets"), { recursive: true });
}
function injectStaticSchemas(root, site) {
  const dist = path.join(root, "dist");
  const fixedFiles = [["/", "index.html"]].concat(STATIC_ROUTES);
  for (const entry of fixedFiles) {
    const target = path.join(dist, entry[1]);
    let html = replaceFixedHeadMetadata(fs.readFileSync(target, "utf8"), site, entry[0], entry[1]);
    if (entry[0] === "/") html = replaceJsonLd(html, homepageSchema(site), entry[1]);
    if (entry[0] === "/about") html = replaceJsonLd(html, aboutSchema(site), entry[1]);
    if (entry[0] === "/logistics") html = replaceJsonLd(html, serviceSchema(site, { canonical: site.origin + "/logistics", name: "Timepiece Acquisition & Logistics", serviceType: "Luxury timepiece acquisition and logistics guidance", description: site.pages["/logistics"].description, breadcrumbName: "Acquisition & Logistics" }), entry[1]);
    html = normalizeStaticBranding(html);
    html = injectContextualFooterLinks(html);
    fs.writeFileSync(target, html);
  }
}
function normalizeStaticBranding(html) {
  return html.replaceAll("Your Wealth, Excelled.", "Your Time, Defined.");
}
function injectContextualFooterLinks(html) {
  const cyprusRoute = locationPages.find((page) => /cyprus/i.test(page.path))?.path || "/luxury-watches-cyprus";
  const limassolRoute = locationPages.find((page) => /limassol/i.test(page.path))?.path || "/luxury-watches-limassol";
  const links = '<nav class="seo-footer-links" aria-label="Contextual links"><a href="' + esc(cyprusRoute) + '">Luxury watches in Cyprus</a><a href="' + esc(limassolRoute) + '">Luxury watches in Limassol</a><a href="' + esc(journalPage.path) + '">Journal</a><a href="/sourcing">Sourcing</a><a href="/watches">Watches</a></nav>';
  if (html.includes('class="seo-footer-links"')) return html;
  return html.replace(/(<div class="footer-copyright")/i, links + "$1");
}
function writeSitemap(root, routes) {
  const rows = ['  <url><loc>' + ORIGIN + "/</loc></url>"];
  for (const entry of routes.filter(function(route) { return route.type !== "home"; })) rows.push("  <url><loc>" + esc(entry.canonical) + "</loc>" + (entry.watch ? "<lastmod>" + entry.watch.dateModified + "</lastmod>" : "") + "</url>");
  fs.writeFileSync(path.join(root, "dist", "sitemap.xml"), '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + rows.join("\n") + "\n</urlset>\n");
}
export function buildSite(root = ROOT) {
  const site = validateSite(readJson(path.join(root, "site.json")), root);
  validateEditorialContent();
  const catalog = loadCatalog(root);
  const routes = buildRouteManifest(catalog, { origin: site.origin, pageMap: site.pages });
  if (routes.length !== 52) fail("expected exactly 52 canonical routes after editorial integration; found " + routes.length);
  const dist = path.join(root, "dist");
  if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });
  copyPublic(root);
  injectStaticSchemas(root, site);
  fs.writeFileSync(path.join(dist, "index.html"), injectHomepage(fs.readFileSync(path.join(dist, "index.html"), "utf8"), catalog, root));
  for (const entry of routes) {
    if (entry.path === "/" || entry.type === "static") continue;
    const target = path.join(dist, entry.path.slice(1), "index.html");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, renderRoute(entry, catalog, site, root));
  }
  fs.writeFileSync(path.join(dist, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: " + site.origin + "/sitemap.xml\n");
  writeSitemap(root, routes);
  return { catalog: catalog, routes: routes, dist: dist };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = buildSite();
  console.log("Built " + result.routes.length + " canonical routes and " + result.catalog.length + " catalog records into " + result.dist);
}
