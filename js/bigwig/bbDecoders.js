import {IGVColor} from 'igv-utils'

function getDecoder(definedFieldCount, fieldCount, autoSql, format) {

    if ("bigbed" === format || (autoSql && ('bed' === autoSql.table))) {
        return decodeBed
    }
    if ("biggenepred" === format || (autoSql && ('genePred' === autoSql.table))) {
        return decodeGenePred
    }
    const standardFieldCount = definedFieldCount - 3
    return function (feature, tokens) {

        if (standardFieldCount > 0) {
            feature.name = tokens[0]
        }
        if (standardFieldCount > 1) {
            feature.score = Number(tokens[1])
        }
        if (standardFieldCount > 2) {
            feature.strand = tokens[2]
        }
        if (standardFieldCount > 3) {
            feature.cdStart = parseInt(tokens[3])
        }
        if (standardFieldCount > 4) {
            feature.cdEnd = parseInt(tokens[4])
        }
        if (standardFieldCount > 5) {
            if (tokens[5] !== "." && tokens[5] !== "0" && tokens[5] !== "-1") {
                const c = IGVColor.createColorString(tokens[5])
                feature.color = c.startsWith("rgb") ? c : undefined
            }
        }
        if (standardFieldCount > 8) {
            const exonCount = parseInt(tokens[6])
            const exonSizes = tokens[7].split(',')
            const exonStarts = tokens[8].split(',')
            const exons = []
            for (let i = 0; i < exonCount; i++) {
                const eStart = feature.start + parseInt(exonStarts[i])
                const eEnd = eStart + parseInt(exonSizes[i])
                exons.push({start: eStart, end: eEnd})
            }
            findUTRs(exons, feature.cdStart, feature.cdEnd)
            feature.exons = exons
        }

        if (autoSql) {
            // TODO -- these should be equal, validate?  fieldCount-definedFieldCount, as.fields.length, tokens.length-3
            const extraStart = definedFieldCount
            for (let i = extraStart; i < fieldCount; i++) {
                if (i < autoSql.fields.length) {
                    const name = autoSql.fields[i].name
                    const value = tokens[i - 3]
                    feature[name] = value
                }
            }
        }
    }
}

function findUTRs(exons, cdStart, cdEnd) {

    for (let exon of exons) {
        const end = exon.end
        const start = exon.start
        if (end < cdStart || start > cdEnd) {
            exon.utr = true
        } else {
            if (cdStart >= start && cdStart <= end) {
                exon.cdStart = cdStart
            }
            if (cdEnd >= start && cdEnd <= end) {
                exon.cdEnd = cdEnd
            }
        }
    }
}

export default getDecoder
