const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const assetsDir = path.join(__dirname, 'assets');

async function processImages() {
  const files = fs.readdirSync(assetsDir);
  
  // Favicon processing specifically (trimmed emblem on solid black #000000 background)
  const srcLogo = path.join(assetsDir, 'logo_transparent.png');
  if (fs.existsSync(srcLogo)) {
    console.log('Generating black-background favicons...');
    const trimmedEmblemBuffer = await sharp(srcLogo).trim().toBuffer();
    const sizes = [
      { name: 'favicon.png', size: 512 },
      { name: 'favicon-192x192.png', size: 192 },
      { name: 'favicon-48x48.png', size: 48 },
      { name: 'apple-touch-icon.png', size: 180 },
      { name: 'favicon-32x32.png', size: 32 },
      { name: 'favicon-16x16.png', size: 16 }
    ];

    for (const { name, size } of sizes) {
      const emblemSize = Math.round(size * 0.94);
      const resizedEmblem = await sharp(trimmedEmblemBuffer)
        .resize(emblemSize, emblemSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toBuffer();

      const outPath = path.join(assetsDir, name);
      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 1 }
        }
      })
        .composite([{ input: resizedEmblem, gravity: 'center' }])
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
