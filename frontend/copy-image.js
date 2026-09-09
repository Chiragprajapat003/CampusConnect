const fs = require('fs');
const path = require('path');

// The path to the image you uploaded to me in the AI chat
const sourcePath = 'C:\\Users\\CHIRAG PRAJAPAT\\.gemini\\antigravity-ide\\brain\\d8eb848a-5e5f-4058-86e4-6202ee1dc0dc\\.user_uploaded';

// The destination folder in your app
const destDir = path.join(__dirname, 'assets', 'images');
const destFile = path.join(destDir, 'gate.jpg');

// Find the latest uploaded image
try {
  const files = fs.readdirSync(sourcePath);
  const images = files.filter(f => f.startsWith('media_') && (f.endsWith('.jpg') || f.endsWith('.png')));
  
  if (images.length === 0) {
    console.log("❌ Could not find the uploaded image.");
    process.exit(1);
  }

  // Sort by modified time to get the newest one
  images.sort((a, b) => {
    return fs.statSync(path.join(sourcePath, b)).mtime.getTime() - 
           fs.statSync(path.join(sourcePath, a)).mtime.getTime();
  });

  const latestImage = images[0];
  const fullSourcePath = path.join(sourcePath, latestImage);

  // Create assets/images if it doesn't exist
  if (!fs.existsSync(destDir)){
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Copy the file
  fs.copyFileSync(fullSourcePath, destFile);
  console.log("✅ SUCCESS! The gate image has been copied to: " + destFile);
  console.log("You can now safely uncomment the require() line in onboarding.jsx!");
  
} catch (error) {
  console.log("❌ Error copying file: ", error.message);
}
