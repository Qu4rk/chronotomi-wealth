# Optimization Notes - Chronotomi Wealth

## What Changed

1. **Automated Asset Generation**: 
   - We used `sharp` (via the `optimize-assets.js` script) to automatically generate `.avif` and `.webp` versions of all `.png`, `.jpg`, and `.jpeg` assets without reducing visible quality.
   - For images with a width >= 1000px, responsive sizes (`-400w` and `-800w`) were also generated to avoid sending massive payloads to mobile devices.
   - We cleanly generated proper `favicon.ico` and `apple-touch-icon.png` from the existing `favicon-actual.png`.

2. **HTML Image Delivery**:
   - `<img>` tags across `index.html`, `advisory.html`, `about.html`, `logistics.html`, `terms.html`, and `privacy.html` were converted to `<picture>` tags.
   - Each `<picture>` element safely falls back to the original format, serving `.avif` if supported by the browser, then `.webp`.
   - `loading="lazy"` and `decoding="async"` were added to below-the-fold content to prioritize visible assets.
   - Critical LCP images (like the hero video posters, and the main logo) were treated with `fetchpriority="high"` and are *not* lazy-loaded.

3. **Dynamic Inventory Images**:
   - The JS rendering logic in `script.js` was modified. It now outputs `<picture>` elements for each watch card dynamically by swapping the file extensions (`.png/.jpg` to `.avif/.webp`), keeping the source `watches.json` untouched.

4. **Script Delivery**:
   - `defer` attributes were added to the `script.js` and `watches.js` references to ensure they don't block the HTML parser.

## File Naming Details
- `basename.avif` and `basename.webp` were generated alongside every image.
- Responsive versions are suffixed as `basename-400.ext` and `basename-800.ext`. The browser automatically selects the appropriate one using `srcset`.

## GitHub Pages vs GoDaddy
- **GitHub Pages**: While GitHub Pages doesn't allow setting custom cache headers (so you won't see caching improvements), the file size reductions from AVIF/WebP, combined with responsive images and preloads, provide massive speed benefits immediately.
- **GoDaddy**: An `.htaccess` file has been added. When the site is moved to GoDaddy (Apache), this file will automatically ensure that correct MIME types are served, gzip/brotli compression is active for text-based files, and browsers cache assets for 1 year.

## Manual Deployment Steps Remaining
There are no additional steps required to run the site. Simply commit the changes and push to GitHub. When you move to GoDaddy, the `.htaccess` file will begin working automatically.
