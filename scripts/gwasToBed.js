const fs = require('fs');
//const process = require('process');
import GWASParser from "../js/gwas/gwasParser.js";



const gwasFile = process.argv[2];
const bedFile = process.argv[3];
const gwasPath = require.resolve(gwasFile);
const data = fs.readFileSync(gwasPath, 'utf-8');

const bedPath = require.resolve(bedFile);
var fd = fs.openSync(bedPath, 'w');

parse(data)
    .then(console.log("Done"));

async function parse(data) {
    const parser = new GWASParser({});
    parser.parseHeader(data);
    const features =  parser.parseFeatures(data);
    for(let f of features) {
        if(f.chr && f.chr.indexOf(';') < 0 && f.chr.indexOf(' ') < 0 && isNumeric(f.start) && isNumeric(f.end)) {
            fs.writeSync(fd, `chr${f.chr}\t${f.start}\t${f.end}\t${f.getAttribute("SNPS")}\t${f.value}\n`, null, 'utf-8')
        }
    }
    fs.closeSync(fd);
}


function isNumeric(value) {
    return /^-{0,1}\d+$/.test(value);
}