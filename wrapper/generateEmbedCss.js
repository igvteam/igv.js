const fs = require('fs');

let ping = fs.readFileSync('../css/igv.css', 'utf-8');
ping = ping.replace(/\r\n/g, '\\n');
ping = ping.replace(/\n/g, '\\n');
ping = ping.replace(/"/g, '\\"');
let foo = fs.readFileSync('./embedCssTemplate.js',  'utf-8');
foo = foo.replace('_CSS_', ping);
fs.writeFileSync('../js/embedCss.js', foo,  'utf-8');