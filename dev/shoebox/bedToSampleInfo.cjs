const fs = require('fs');
const path = require('path');

const colors = new Map()

const data = fs.readFileSync('./celltypeAnnotation.bed', {encoding: 'utf-8'})
const lines = data.split('\n')
let output = '#sampleTable\n'

output += 'sample\tcelltype\n'
for(let l of lines) {
    if(l.startsWith('track')) continue

    const tokens = l.split('\t')
    if(tokens.length < 9) continue

    const cellType = tokens[3]
    const color = tokens[8]
    colors.set(cellType, color)

    const start = parseInt(tokens[1])
    const end = parseInt(tokens[2])
    for(let c = start; c<= end; c++) {
        output += `${c}\t${cellType}\n`
    }
}

output += '\n#colors\n'
for(let k of colors.keys()) {
    output += `celltype\t${k}\t${colors.get(k)}\n`
}

fs.writeFileSync('./sampleInfo.txt', output, {encoding: 'utf-8'})

//track name="cellType" description="Cell type annotation" visibility=2 itemRgb="On"
// celltype	1	620	NK	100	.	1	620	73,34,100

