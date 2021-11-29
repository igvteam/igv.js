function scoreShade(score, color) {
    const alpha = Math.min(1, 0.11 + 0.89 * (score / 779))
    return alpha.toString()
}

function parseAutoSQL(str) {

    let table
    const fields = []
    let startDecoding = false
    const lines = str.trim().split(/\s*[\r\n]+\s*/g)
    for (let line of lines) {
        if (line.startsWith('table')) {
            table = line.split(/\s+/)[1].trim()
        } else if (line.startsWith('(')) {
            startDecoding = true
        } else if (line.startsWith(')')) {
        } else if (startDecoding) {
            if (line.length > 0) {
                const idx = line.indexOf(';')
                const tokens = line.substr(0, idx).split(/\s+/)
                const description = line.substr(idx + 1).replace(/"/g, '').trim()
                fields.push({
                    type: tokens[0],
                    name: tokens[1],
                    description: description
                })
            }
        }
    }
    return {
        table: table,
        fields: fields
    }
}


export {scoreShade, parseAutoSQL}