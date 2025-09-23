import {StringUtils} from "../node_modules/igv-utils/src/index.js"

class Locus {

    constructor({chr, start, end}) {
        this.chr = chr
        this.start = start
        this.end = end
    }


    contains(locus) {
        return locus.chr === this.chr && locus.start >= this.start && locus.end <= this.end
    }

    overlaps(locus) {
        return locus.chr === this.chr && !(locus.end < this.start || locus.start > this.end)
    }

    extend(l) {
        if (l.chr !== this.chr) return
        this.start = Math.min(l.start, this.start)
        this.end = Math.max(l.end, this.end)
    }

    getLocusString() {
        if ('all' === this.chr) {
            return 'all'
        } else {
            const ss = StringUtils.numberFormatter(Math.floor(this.start) + 1)
            const ee = StringUtils.numberFormatter(Math.round(this.end))
            return `${this.chr}:${ss}-${ee}`
        }
    }

    static fromLocusString(str) {
        if ('all' === str) {
            return new Locus({chr: 'all'})
        }
        const parts = str.split(':')
        const chr = parts[0]
        const se = parts[1].split("-")
        const start = Number.parseInt(se[0].replace(/,/g, "")) - 1
        const end = Number.parseInt(se[1].replace(/,/g, ""))
        return new Locus({chr, start, end})
    }

    /**
     * Return true if the locus string represents a single base, e.g. "chr1:12345" or "chr1:12345-12345"
     * @param locus
     * @returns {boolean}
     */
    static isSingleBaseLocusString(locus) {

        if (!locus || typeof locus !== 'string') {
            return false
        }

        const parts = locus.split(':')
        if (parts.length <= 1) {
            return false
        }

        const range = parts[1].replace(/,/g, '')
        if (!range) {
            return false
        }

        const rangeParts = range.split('-')
        const startString = rangeParts[0]
        const start = parseInt(startString, 10)

        if (String(start) !== startString || !Number.isInteger(start)) {
            return false
        }

        if (rangeParts.length === 1) {
            return true
        }

        const endString = rangeParts[1]
        const end = parseInt(endString, 10)

        if (String(end) !== endString || !Number.isInteger(end)) {
            return false
        }

        return start === end
    }
}

export default Locus