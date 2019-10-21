const fs = require('fs');
import {decodeDataURI} from "../js/util/uriUtils.js"

const path = require.resolve('/Users/jrobinso/Downloads/big_session.js');
let ping = fs.readFileSync(path, 'utf-8');
const l = ping.length;
const datauri = ping.substr(0, l - 2);


const bytes = decodeDataURI(datauri);
let json = ''
for (let b of bytes) {
    json += String.fromCharCode(b)
}

const j = JSON.parse(json);

for(let t of j.tracks) {
    if(t.name === "HG00514.pbmm.lra") {
        const pb_datauri = t.url;
        const out = 'pb_datauri.txt';
        fs.writeFileSync(out, pb_datauri, 'UTF-8');
        break;
    }
}
const seq = "seq_datauri.txt";
fs.writeFileSync(seq, j.reference.fastaURL, 'UTF-8');

const outputPath = 'big_session.json'
fs.writeFileSync(outputPath, json,  'utf-8');


