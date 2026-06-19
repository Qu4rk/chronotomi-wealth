const sharp = require('sharp');
const fs = require('fs');

async function makeFavicon() {
  const logoPath = './assets/logo_transparent.png';

  // 1. Resized logo for 512x512 canvas
  const resizedLogoGoogle = await sharp(logoPath)
    .trim()
    .resize({ width: 440, height: 440, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // 2. Resized logo for 32x32 canvas (Pure transparent background)
  const resizedLogoTab = await sharp(logoPath)
    .trim()
    .resize({ width: 32, height: 32, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // For Apple Touch Icon: Solid black background
  const appleBgBuffer = await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
  }).png().toBuffer();

  const appleTouchIcon = await sharp(appleBgBuffer)
    .composite([{ input: resizedLogoGoogle, gravity: 'center' }])
    .png()
    .toBuffer();
  fs.writeFileSync('./assets/apple-touch-icon.png', appleTouchIcon);

  // For Google Search: Transparent background with black circle
  const circleSvg = `<svg width="512" height="512"><circle cx="256" cy="256" r="256" fill="#000000" /></svg>`;
  const googleFavicon = await sharp(Buffer.from(circleSvg))
    .composite([{ input: resizedLogoGoogle, gravity: 'center' }])
    .png()
    .toBuffer();
  fs.writeFileSync('./assets/favicon.png', googleFavicon);

  // For Browser Tab: Pure transparent background with just the logo
  fs.writeFileSync('./assets/favicon-32x32.png', resizedLogoTab);
  
  console.log("Favicons generated");
}

makeFavicon().catch(console.error);
