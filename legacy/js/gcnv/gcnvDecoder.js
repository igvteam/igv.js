/**
 * Decode a gcnv record, a bed style format encoding copy number variation
 *
 * @param tokens
 * @param header
 */

function decodeGcnv(tokens, header) {

    const columnNames = header.columnNames
    if (!columnNames) {
        throw Error("Sample names are not defined.   Missing column headers?")
    }
    const sampleCount = columnNames.length - 3

    const chr = tokens[0]
    const start = parseInt(tokens[1])
    const end = parseInt(tokens[2])
    const values = tokens.slice(3).map(Number)

    if (values.length == sampleCount) {
        return {
            chr: chr,
            start: start,
            end: end,
            values: values,
        }
    } else {
        // TODO Throw error?
        console.warn(`${chr}:${start}-${end} row contains ${values.length} sample columns instead of the expected ${sampleCount} columns. Skipping...`)
        return undefined
    }
}

export {decodeGcnv}
