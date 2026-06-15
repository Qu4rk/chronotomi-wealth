const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const assetsDir = path.join(__dirname, 'assets');

async function processImages() {
  const files = fs.readdirSync(assetsDir);
  
  // Favicon processing specifically
  if (files.includes('favicon-actual.png')) {
    const favInput = path.join(assetsDir, 'favicon-actual.png');
    console.log('Generating favicons...');
    await sharp(favInput).resize(180, 180).toFile(path.join(assetsDir, 'apple-touch-icon.png'));
    await sharp(favInput).resize(32, 32).toFile(path.join(assetsDir, 'favicon.ico'));
  }

  for (const file of files) {
    if (!file.match(/\.(png|jpe?g|webp)$/i)) continue;
    if (file.includes('-400') || file.includes('-800') || file === 'favicon-actual.png' || file === 'favicon.ico' || file === 'apple-touch-icon.png') continue;

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
