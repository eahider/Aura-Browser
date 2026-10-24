const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'mobile');
const distDir = path.join(__dirname, '..', 'mobile', 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const filesToCopy = [
  'index.html',
  'styles.css',
  'app.js',
  'privacyShield.js',
  'i18n.js',
  'subscriptionParser.js'
];

for (const file of filesToCopy) {
  const src = path.join(srcDir, file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`[Mobile Build] Copied ${file} -> mobile/dist/`);
  } else {
    console.warn(`[Mobile Build] Warning: ${file} not found in mobile/`);
  }
}

// Copy icons if available
const buildIcon = path.join(__dirname, '..', 'build', 'icon.png');
if (fs.existsSync(buildIcon)) {
  fs.copyFileSync(buildIcon, path.join(distDir, 'icon.png'));
  console.log(`[Mobile Build] Copied icon.png -> mobile/dist/`);
}

console.log('[Mobile Build] Complete! mobile/dist is ready for Capacitor.');
