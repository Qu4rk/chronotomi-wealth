const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const assetsDir = path.join(__dirname, 'assets');

async function processImages() {
  const files = fs.readdirSync(assetsDir);
  
  // Favicon processing: pure transparent background for all favicon sizes (16x16, 32x32, 48x48, 192x192, 512x512, favicon.ico)
  const srcLogo = path.join(assetsDir, 'logo_transparent.png');
  if (fs.existsSync(srcLogo)) {
    console.log('Generating transparent favicons...');
    const trimmedEmblemBuffer = await sharp(srcLogo).trim().toBuffer();

    const faviconSizes = [
      { name: 'favicon-16x16.png', size: 16 },
      { name: 'favicon-32x32.png', size: 32 },
      { name: 'favicon-48x48.png', size: 48 },
      { name: 'favicon-192x192.png', size: 192 },
      { name: 'favicon.png', size: 512 }
    ];

    for (const { name, size } of faviconSizes) {
      const outPath = path.join(assetsDir, name);
      await sharp(trimmedEmblemBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outPath);

      if (name === 'favicon.png') {
        await sharp(outPath).webp({ quality: 90 }).toFile(path.join(assetsDir, 'favicon.webp'));
        await sharp(outPath).avif({ quality: 85 }).toFile(path.join(assetsDir, 'favicon.avif'));
      } else if (name === 'favicon-32x32.png') {
        await sharp(outPath).webp({ quality: 90 }).toFile(path.join(assetsDir, 'favicon-32x32.webp'));
        await sharp(outPath).avif({ quality: 85 }).toFile(path.join(assetsDir, 'favicon-32x32.avif'));
      }
    }

    const fav32 = path.join(assetsDir, 'favicon-32x32.png');
    fs.copyFileSync(fav32, path.join(assetsDir, 'favicon.ico'));
    fs.copyFileSync(fav32, path.join(__dirname, 'favicon.ico'));

    // Apple touch icon (180x180) on black background for iOS home screen
    const appleEmblem = await sharp(trimmedEmblemBuffer)
      .resize(170, 170, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    await sharp({
      create: { width: 180, height: 180, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
    })
      .composite([{ input: appleEmblem, gravity: 'center' }])
      .png()
      .toFile(path.join(assetsDir, 'apple-touch-icon.png'));
  }

  for (const file of files) {
    if (!file.match(/\.(png|jpe?g|webp)$/i)) continue;
    if (file.includes('-400') || file.includes('-800') || file.startsWith('favicon') || file === 'apple-touch-icon.png') continue;

    const inputPath = path.join(assetsDir, file);
    const ext = path.extname(file);
    const basename = path.basename(file, ext);

    console.log(`Processing: ${file}`);
    
    try {
      const metadata = await sharp(inputPath).metadata();
      
      // Generate AVIF and WebP full size
      await sharp(inputPath).avif({ quality: 75, effort: 4 }).toFile(path.join(assetsDir, `${basename}.avif`));
      await sharp(inputPath).webp({ quality: 80 }).toFile(path.join(assetsDir, `${basename}.webp`));

      // If image is large, generate responsive variants
      if (metadata.width >= 1000) {
        console.log(`  Generating responsive sizes for ${file}`);
        
        // 800w
        await sharp(inputPath).resize({ width: 800, withoutEnlargement: true })
          .avif({ quality: 75 }).toFile(path.join(assetsDir, `${basename}-800.avif`));
        await sharp(inputPath).resize({ width: 800, withoutEnlargement: true })
          .webp({ quality: 80 }).toFile(path.join(assetsDir, `${basename}-800.webp`));
        await sharp(inputPath).resize({ width: 800, withoutEnlargement: true })
          .toFile(path.join(assetsDir, `${basename}-800${ext}`));

        // 400w
        await sharp(inputPath).resize({ width: 400, withoutEnlargement: true })
          .avif({ quality: 75 }).toFile(path.join(assetsDir, `${basename}-400.avif`));
        await sharp(inputPath).resize({ width: 400, withoutEnlargement: true })
          .webp({ quality: 80 }).toFile(path.join(assetsDir, `${basename}-400.webp`));
        await sharp(inputPath).resize({ width: 400, withoutEnlargement: true })
          .toFile(path.join(assetsDir, `${basename}-400${ext}`));
      }
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }
  
  console.log('Optimization complete!');
}

processImages();
