import fs from 'fs';
import https from 'https';

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

async function main() {
  await download('https://ui-avatars.com/api/?name=S+U&size=192&background=4f46e5&color=fff&font-size=0.4', './public/pwa-192x192.png');
  await download('https://ui-avatars.com/api/?name=S+U&size=512&background=4f46e5&color=fff&font-size=0.4', './public/pwa-512x512.png');
  console.log('Icons downloaded');
}

main();
