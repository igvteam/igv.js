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
        return locus.chr === this.chr
            && !(locus.end < this.start || locus.start > this.end)
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
}

export default Locus