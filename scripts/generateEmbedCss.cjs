const fs = require('fs')

const cssPath = require.resolve('../css/igv.css')
let inlineCSS = fs.readFileSync(cssPath, 'utf-8')
inlineCSS = inlineCSS.replace(/\r\n/g, '\\n')
inlineCSS = inlineCSS.replace(/\n/g, '\\n')
inlineCSS = inlineCSS.replace(/"/g, '\\"')

const foo = `export default '${inlineCSS}'`

const outputPath = require.resolve('../js/embedCss.js')
fs.writeFileSync(outputPath, foo, 'utf-8')
