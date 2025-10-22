import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve paths relative to current directory
const cssPath = resolve(__dirname, '../css/igv.css');
let inlineCSS = fs.readFileSync(cssPath, 'utf-8');
inlineCSS = inlineCSS.replace(/\r\n/g, '\\n');
inlineCSS = inlineCSS.replace(/\n/g, '\\n');
inlineCSS = inlineCSS.replace(/"/g, '\\"');

const cssContent = `export default '${inlineCSS}'`;

const outputPath = resolve(__dirname, '../js/embedCss.js');
fs.writeFileSync(outputPath, cssContent, 'utf-8');