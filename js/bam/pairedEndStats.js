class PairedEndStats {

    constructor(alignments, {minTLENPercentile, maxTLENPercentile}) {
        this.totalCount = 0
        this.frCount = 0
        this.rfCount = 0
        this.ffCount = 0
        this.sumF = 0
        this.sumF2 = 0
        this.lp = minTLENPercentile === undefined ? 0.1 : minTLENPercentile
        this.up = maxTLENPercentile === undefined ? 99.5 : maxTLENPercentile
        this.isizes = []
        this.compute(alignments)
    }

    compute(alignments) {

        for (let alignment of alignments) {
            if (alignment.isProperPair()) {
                var tlen = Math.abs(alignment.fragmentLength)
                this.sumF += tlen
                this.sumF2 += tlen * tlen
                this.isizes.push(tlen)

                var po = alignment.pairOrientation

                if (typeof po === "string" && po.length === 4) {
                    var tmp = '' + po.charAt(0) + po.charAt(2)
                    switch (tmp) {
                        case 'FF':
                        case 'RR':
                            this.ffCount++
                            break
                        case "FR":
                            this.frCount++
                            break
                        case"RF":
                            this.rfCount++
                    }
                }
                this.totalCount++
            }
        }

        if (this.ffCount / this.totalCount > 0.9) this.orienation = "ff"
        else if (this.frCount / this.totalCount > 0.9) this.orienation = "fr"
        else if (this.rfCount / this.totalCount > 0.9) this.orienation = "rf"

        this.minTLEN = this.lp === 0 ? 0 : percentile(this.isizes, this.lp)
        this.maxTLEN = percentile(this.isizes, this.up)

        // var fMean = this.sumF / this.totalCount
        // var stdDev = Math.sqrt((this.totalCount * this.sumF2 - this.sumF * this.sumF) / (this.totalCount * this.totalCount))
        // this.minTLEN = fMean - 3 * stdDev
        // this.maxTLEN = fMean + 3 * stdDev

    }
}

function percentile(array, p) {

    if (array.length === 0) return undefined
    var k = Math.floor(array.length * (p / 100))
    array.sort(function (a, b) {
        return a - b
    })
    return array[k]

}

export default PairedEndStats
