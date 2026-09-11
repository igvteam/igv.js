import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve paths relative to current directory
const cssPath = resolve(__dirname, '../css/igv.css');
const inlineCSS = fs.readFileSync(cssPath, 'utf-8');

// JSON.stringify escapes newlines, quotes and backslashes correctly.  Hand-rolled
// escaping missed backslashes and single quotes, which CSS escape sequences
// (content: "\2014") and quoted url()/font-family values would have broken.
const cssContent = `export default ${JSON.stringify(inlineCSS)}`;

const outputPath = resolve(__dirname, '../js/embedCss.js');
fs.writeFileSync(outputPath, cssContent, 'utf-8');