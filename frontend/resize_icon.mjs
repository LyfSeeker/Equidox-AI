import sharp from 'sharp';
import fs from 'fs';

const inputPath = 'src/app/icon.png';
const tempPath = 'src/app/icon_small.png';

async function resize() {
  try {
    console.log('Starting resize...');
    const info = await sharp(inputPath)
      .resize(64, 64)
      .toFile(tempPath);
    
    console.log('Resized successfully', info);
    fs.renameSync(tempPath, inputPath);
    console.log('Replaced original icon.png with smaller version');
  } catch (err) {
    console.error('Error resizing image:', err);
  }
}

resize();
