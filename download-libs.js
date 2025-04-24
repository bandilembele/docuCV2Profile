const https = require('https');
const fs = require('fs');
const path = require('path');

const libs = {
  'mammoth.browser.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
  'pdf.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'pdf.worker.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
};

const libsDir = path.join(__dirname, 'libs');

if (!fs.existsSync(libsDir)) {
  fs.mkdirSync(libsDir);
}

Object.entries(libs).forEach(([filename, url]) => {
  const filePath = path.join(libsDir, filename);
  const file = fs.createWriteStream(filePath);
  
  https.get(url, (response) => {
    response.pipe(file);
    
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded ${filename}`);
    });
  }).on('error', (err) => {
    fs.unlink(filePath);
    console.error(`Error downloading ${filename}:`, err.message);
  });
}); 