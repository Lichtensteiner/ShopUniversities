
import fs from 'fs';

const content = fs.readFileSync('src/contexts/LanguageContext.tsx', 'utf8');
const lines = content.split('\n');
const keyRegex = /'([a-zA-Z0-9_]+)':/g;
const keys = [];
let match;

let inTranslations = false;
for (const line of lines) {
  if (line.includes('const translations: Record<string, Record<Language, string>> = {')) {
    inTranslations = true;
    continue;
  }
  if (inTranslations && line.trim() === '};') {
    inTranslations = false;
    break;
  }
  if (inTranslations) {
    const m = line.match(/'([a-zA-Z0-9_]+)':/);
    if (m) {
      keys.push({ key: m[1], line: lines.indexOf(line) + 1 });
    }
  }
}

const counts: Record<string, number[]> = {};
keys.forEach(k => {
  if (!counts[k.key]) counts[k.key] = [];
  counts[k.key].push(k.line);
});

const duplicates = Object.entries(counts).filter(([k, lines]) => lines.length > 1);

if (duplicates.length > 0) {
  console.log('Duplicate keys found:');
  duplicates.forEach(([k, lines]) => {
    console.log(`${k}: lines ${lines.join(', ')}`);
  });
} else {
  console.log('No duplicate keys found.');
}
