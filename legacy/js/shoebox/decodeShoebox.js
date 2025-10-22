import DecodeError from "../feature/decode/decodeError.js"

export default function decodeShoebox(tokens, header, maxColumnCount = Number.MAX_SAFE_INTEGER) {

    if (tokens.length < 4) return undefined

    const chr = tokens[0]
    const start = parseInt(tokens[1])
    const end = parseInt(tokens[2])
    if (isNaN(start) || isNaN(end)) {
        return new DecodeError(`Unparsable bed record.`)
    }
    const feature = {chr, start, end}

    const values = []
    for(let i = 3; i< tokens.length; i++) {
        values.push(Number.parseFloat(tokens[i]))
    }
    feature.values = values;


    return feature
}
