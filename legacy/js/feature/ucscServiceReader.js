import {igvxhr} from "../../node_modules/igv-utils/src/index.js"

const UCSCServiceReader = function (config, genome) {
    this.config = config
    this.genome = genome
    this.expandQueryInterval = false
}

UCSCServiceReader.prototype.readFeatures = function (chr, start, end) {

    const s = Math.max(0, Math.floor(start))
    let e = Math.ceil(end)

    if (this.genome) {
        const c = this.genome.getChromosome(chr)
        if (c && e > c.bpLength) {
            e = c.bpLength
        }
    }


    const url = this.config.url + '?db=' + this.config.db + '&table=' + this.config.tableName + '&chr=' + chr + '&start=' + s + '&end=' + e

    return igvxhr.loadJson(url, this.config)
        .then(function (data) {
            if (data) {
                data.forEach(function (sample) {
                    if (sample.hasOwnProperty('exonStarts') &&
                        sample.hasOwnProperty('exonEnds') &&
                        sample.hasOwnProperty('exonCount') &&
                        sample.hasOwnProperty('cdsStart') &&
                        sample.hasOwnProperty('cdsEnd')) {
                        addExons(sample)
                    }
                })
                return data
            } else {
                return null
            }
        })
}

function addExons(sample) {
    var exonCount, exonStarts, exonEnds, exons, eStart, eEnd
    exonCount = sample['exonCount']
    exonStarts = sample['exonStarts'].split(',')
    exonEnds = sample['exonEnds'].split(',')
    exons = []

    for (var i = 0; i < exonCount; i++) {
        eStart = parseInt(exonStarts[i])
        eEnd = parseInt(exonEnds[i])
        var exon = {start: eStart, end: eEnd}

        if (sample.cdsStart > eEnd || sample.cdsEnd < sample.cdsStart) exon.utr = true   // Entire exon is UTR
        if (sample.cdsStart >= eStart && sample.cdsStart <= eEnd) exon.cdStart = sample.cdsStart
        if (sample.cdsEnd >= eStart && sample.cdsEnd <= eEnd) exon.cdEnd = sample.cdsEnd

        exons.push(exon)
    }

    sample.exons = exons
}

export default UCSCServiceReader