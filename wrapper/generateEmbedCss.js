const fs = require('fs');

const cssPath = require.resolve('../css/igv.css')
let ping = fs.readFileSync(cssPath, 'utf-8');
ping = ping.replace(/\r\n/g, '\\n');
ping = ping.replace(/\n/g, '\\n');
ping = ping.replace(/"/g, '\\"');

const templatePath = require.resolve('./embedCssTemplate.js')
let foo = fs.readFileSync(templatePath,  'utf-8');
foo = foo.replace('_CSS_', ping);

const outputPath = require.resolve('../js/embedCss.js')
fs.writeFileSync(outputPath, foo,  'utf-8');