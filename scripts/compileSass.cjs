const sass = require('sass');
const fs = require('fs');
const path = require('path');

// Get the absolute paths
const cssDir = path.resolve(__dirname, '../css');
const inputFile = path.join(cssDir, 'igv.scss');
const outputFile = path.join(cssDir, 'igv.css');

// Compile SASS to CSS
const result = sass.compile(inputFile, {
    style: 'compressed',
    sourceMap: true,
    loadPaths: [cssDir]
});

// Write the CSS file
fs.writeFileSync(outputFile, result.css);

// Write the source map
fs.writeFileSync(outputFile + '.map', JSON.stringify(result.sourceMap)); 