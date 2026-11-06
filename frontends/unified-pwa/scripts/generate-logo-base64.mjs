import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const darkPath = path.resolve(__dirname, '../src/assets/TrustHyre Logo with Skills Tagline.png');
const lightPath = path.resolve(__dirname, '../src/assets/TrustHyre Skills and Opportunities Logo.png');
const outPath = path.resolve(__dirname, '../src/assets/logoBase64.ts');

const darkB64 = fs.readFileSync(darkPath).toString('base64');
const lightB64 = fs.readFileSync(lightPath).toString('base64');

const content = `// Auto-generated inline data URIs for reliable html2canvas rasterization
export const darkThemeLogoDataUrl = 'data:image/png;base64,${darkB64}';
export const lightThemeLogoDataUrl = 'data:image/png;base64,${lightB64}';
`;

fs.writeFileSync(outPath, content, 'utf-8');
console.log('Successfully written logoBase64.ts');

