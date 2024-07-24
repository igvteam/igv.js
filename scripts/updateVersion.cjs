const fs = require('fs');

const pj = require.resolve('../package.json');
const jsonText = fs.readFileSync(pj, 'utf-8');
const version = JSON.parse(jsonText).version;

const versionJS = require.resolve('../js/version.js')
let ping = fs.readFileSync(versionJS, 'utf-8');
const lines = ping.split(/\r?\n/);
let foundVersionLine = false;
var fd = fs.openSync(versionJS, 'w');
for (let line of lines) {
    if(!line) continue;
    if(line.startsWith("const _version")) {
        fs.writeSync(fd, `const _version = "${version}"\n`, null, 'utf-8')
        foundVersionLine = true;
    } else {
        fs.writeSync(fd, line + '\n', null, 'utf-8')
    }
}
if(!foundVersionLine) {
    console.error("version line not found");
}

fs.closeSync(fd);