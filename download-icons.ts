import fs from 'fs';
import https from 'https';

const download = (url: string, dest: string) => {
  return new Promise<void>((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

async function main() {
  console.log('Downloading 192x192 icon...');
  await download('https://ui-avatars.com/api/?name=S&background=4f46e5&color=fff&size=192&font-size=0.6', 'public/pwa-192x192.png');
  console.log('Downloading 512x512 icon...');
  await download('https://ui-avatars.com/api/?name=S&background=4f46e5&color=fff&size=512&font-size=0.6', 'public/pwa-512x512.png');
  console.log('Done!');
}

main().catch(console.error);
