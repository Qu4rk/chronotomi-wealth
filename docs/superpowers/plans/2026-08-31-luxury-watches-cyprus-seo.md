# Luxury Watches Cyprus SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use test-driven development for behavior changes. Do not spawn subagents. Commit only files owned by your task.

**Goal:** Make Chronotomi materially more competitive for the organic query `luxury watches cyprus` while preserving the current luxury visual identity.

**Architecture:** Extend the existing Node static-site generator with a validated structured editorial-content module, new location and journal route types, stronger brand/product metadata, and crawlable internal links. Keep `/watches` canonical and render all essential content into static HTML.

**Tech Stack:** Vanilla HTML5, CSS3, JavaScript, Node.js ESM static generator, Vercel clean URLs, dependency-free SEO verifier.

## Global Constraints

- Branch: `codex/luxury-watches-cyprus-seo`; work only in `/Volumes/MicroSD/Projects/Chronotomi-worktrees/luxury-watches-cyprus-seo`.
- Preserve the homepage hero, visual H1 `Your Time, Defined.`, primary navigation composition, palette, Playfair Display/Inter typography, collection cards, filters, spacing rhythm, and motion.
- Keep `/watches`, `/watches/{brand}`, and `/watches/{brand}/{slug}` canonical. Keep `/timepieces` redirecting to `/watches`.
- Homepage title must be exactly `Luxury Watches Cyprus | Private Watch Sourcing | Chronotomi`.
- Homepage description must naturally contain luxury watches, Cyprus, private watch sourcing, Rolex, Patek Philippe, Audemars Piguet, and Cartier.
- New canonical routes: `/luxury-watches-cyprus`, `/luxury-watches-limassol`, `/journal`, `/journal/private-watch-sourcing-cyprus`.
- Cyprus landing body: 500–700 words. Limassol landing body: 400–600 words. Initial guide body: 1,000–1,400 words. Brand introductions: 180–250 words each.
- No claim of a shop, showroom, walk-in premises, authorized-dealer status, public address, price, stock, availability, investment return, unsupported condition, ratings, or reviews.
- Organization schema is permitted; LocalBusiness and Store schema are forbidden while a complete public address is unavailable.
- Product schema must not include Offer, price, availability, ratings, or reviews.
- All essential content and internal links must exist in serialized HTML without JavaScript execution.
- New UI is a restrained extension of the incumbent black editorial system: no generic SEO cards, bright colours, gradients, decorative glass, or dense text walls.
- No merge or production deployment. Push only the feature branch after full validation.

## Shared Content Interface

`content/seo-content.mjs` must export:

- `locationPages`: two records with `path`, `title`, `description`, `eyebrow`, `h1`, `intro`, `sections`, `cta`, `areaServed`, `wordRange`.
- `journalPage`: one record with `path`, `title`, `description`, `eyebrow`, `h1`, `intro`.
- `guides`: one record with `path`, `title`, `description`, `eyebrow`, `h1`, `summary`, `datePublished`, `dateModified`, `sections`, `relatedPaths`, `wordRange`.
- `brandIntroductions`: object keyed by `rolex`, `patek-philippe`, `audemars-piguet`, and `cartier`; each value has `heading` and `paragraphs`.

Section records use `{ heading: string, paragraphs: string[] }`. Copy is plain text only; the generator escapes it before rendering.

---

### Task 1: SEO contract tests

**Owned files:** `tests/seo-check.mjs`, `tests/seo-review.json`.

- Extend the verifier first and record RED evidence before production changes exist.
- Require 52 canonical routes: the current 48 plus the two location routes, journal index, and initial guide.
- Assert exact homepage title and required homepage-description terms.
- Assert each new route has unique title/description, canonical, exactly one H1, OG/Twitter metadata, parseable allowed JSON-LD, sitemap inclusion, and at least one inbound crawlable internal link.
- Assert location/guide serialized body word ranges and four brand-introduction word ranges.
- Assert product H1 and Product `name` contain brand, model, and reference; product OG image resolves to that watch's local primary image.
- Assert WebSite `name` is `Chronotomi`, `alternateName` is `Chronotomi Wealth`, Organization contains logo and verified identifiers, and no LocalBusiness/Store/Offer/price/availability/rating/review data appears.
- Require generated `404.html` with `noindex,follow` and exclude it from the sitemap.
- Run the focused verifier against the unchanged build and capture the expected failures, but do not weaken existing checks.
- Commit with subject `test: define Cyprus SEO route contracts`.

### Task 2: Editorial content and incumbent visual extension

**Owned files:** `content/seo-content.mjs`, `index.html`, `styles.css`.

- Create truthful original copy satisfying all word ranges and the shared content interface.
- Cyprus page themes: private sourcing, concierge process, reference/condition/set information, four named maisons, discreet enquiries, and service across Cyprus.
- Limassol page themes: private sourcing for Limassol clients, clear pre-enquiry information, discreet service-area model; explicitly avoid a physical-retail claim.
- Initial guide: explain how a private sourcing engagement works in Cyprus, from brief through reference verification, condition/set discussion, sourcing conversation, logistics, and handover. Avoid duplicating the Cyprus landing page paragraph-for-paragraph.
- Brand introductions must be distinct and useful, discuss only repository-supported sourcing/collection context, and avoid authorized-retailer language.
- Update source homepage metadata and add the exact requested editorial block after collection and before sourcing:
  - Eyebrow: `LUXURY WATCHES · CYPRUS`
  - Heading: `Luxury Watches in Cyprus`
  - Body: `Discover and privately source sought-after Rolex, Patek Philippe, Audemars Piguet and Cartier timepieces through Chronotomi Wealth's luxury watch concierge in Cyprus.`
- Add subtle links from that block to `/luxury-watches-cyprus` and `/luxury-watches-limassol`.
- Add only the CSS required for an editorial interlude and long-form reading layouts; reuse existing tokens and breakpoints. Do not alter hero/navigation/card selectors.
- Run source-only tests where applicable and self-review copy for unsupported claims.
- Commit with subject `feat: add Cyprus editorial SEO content`.

### Task 3: Static generator, routes, metadata, schema, and 404

**Owned files:** `scripts/build-site.mjs`, `site.json`, `vercel.json`, `404.html`.

- Import and validate the shared content interface, including required fields, route uniqueness, date formats, related paths, and word ranges.
- Add location, journal, and guide route types to the manifest and renderer; include them in sitemap generation and page metadata validation.
- Use the existing SEO page shell and shared stylesheet. Align generated header/footer wording with `Your Time, Defined.` and add restrained contextual/footer links to Cyprus, Limassol, Journal, sourcing, and watches.
- Render location pages as WebPage + Service + BreadcrumbList + Organization; journal as CollectionPage + ItemList + BreadcrumbList; guide as Article + BreadcrumbList + Organization.
- Expand Organization with the real logo, legal identity, company/VAT identifiers, verified phone/email/socials, and Cyprus/Limassol areaServed. Do not emit LocalBusiness or Store.
- Set WebSite `name` to `Chronotomi` and `alternateName` to `Chronotomi Wealth`.
- Render brand introductions above their collections and retain CollectionPage/ItemList schema.
- Change product visible H1 and Product `name` to brand + model + reference, use the primary watch image for OG/Twitter image, and preserve factual catalog-only detail fields and enquiry CTA.
- Generate/copy `404.html` with `noindex,follow`; keep it out of routes and sitemap. Ensure Vercel clean URL behavior remains unchanged.
- Run `npm run check` and commit with subject `feat: generate Cyprus SEO landing pages`.

### Task 4: Integration, visual evidence, review, and delivery

**Owned files:** no new feature ownership; fixes must go back to the task owner or a targeted repair agent.

- Integrate the three commits without rewriting unrelated history.
- Run `npm run check` from a clean working tree.
- Serve `dist` locally and inspect homepage, Cyprus, Limassol, Journal, one brand page, and one product page at 1440px, tablet, and 390px.
- Confirm hero, navigation, filters, cards, forms, animations, responsive layout, footer, redirects, robots, sitemap, 404, canonical URLs, and internal links.
- Run the Impeccable detector once over changed HTML/CSS targets and resolve material mechanical findings.
- Perform a whole-branch code review against the plan and one scoped repair/re-review wave if needed.
- Push `codex/luxury-watches-cyprus-seo` to `origin`; do not merge or deploy production.
