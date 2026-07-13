import sharp from 'sharp';
import fs from 'fs';

const inputPath = 'src/app/icon.png';
const outputPath = 'src/app/icon_temp.png';

async function crop() {
  try {
    console.log('Starting crop...');
    // The trim() function automatically detects the background color from the top-left pixel
    // and removes that solid color, effectively cropping the padding around the logo.
    const info = await sharp(inputPath)
      .trim({ threshold: 50 })
      .toFile(outputPath);
    
    console.log('Cropped successfully', info);
    fs.renameSync(outputPath, inputPath);
    console.log('Replaced original icon.png');
  } catch (err) {
    console.error('Error cropping image:', err);
  }
}

crop();
