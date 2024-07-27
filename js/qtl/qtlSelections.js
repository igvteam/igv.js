import IGVColor from "../../node_modules/igv-utils/src/igv-color.js"

/**
 * Manages XQTL selections.
 */
class QTLSelections {

    constructor() {
        this.clear()
    }

    clear() {
        this.phenotypeColors = new Map()
        this.snps = new Set()
        this.qtl = null
    }

    isEmpty() {
        return this.phenotypeColors.size === 0 &&  this.snps.size === 0 && this.qtl === null
    }

    addSnp(snpName) {
        snpName = snpName.toUpperCase()
        this.snps.add(snpName)
    }

    addPhenotype(geneName) {
        geneName = geneName.toUpperCase()
        const genesCount = this.phenotypeColors.size
        if (!this.phenotypeColors.has(geneName.toUpperCase())) {
            const color = genesCount < brewer.length ? brewer[genesCount] : IGVColor.randomRGB(0, 255)
            this.phenotypeColors.set(geneName.toUpperCase(), color)
        }
    }

    hasSnp(snp) {
        return snp && this.snps.has(snp.toUpperCase())
    }

    hasPhenotype(name) {
        return name && this.phenotypeColors.has(name.toUpperCase())
    }

    hasQTL(qtl) {
        return this.qtls.has(qtl)
    }

    colorForGene(geneName) {
        return geneName ? this.phenotypeColors.get(geneName.toUpperCase()) : "black"
    }

    /**
     * Returns a plain "json like" object, that is an object that is easily converted to json
     * @returns {{}}
     */
    toJSON() {
        const obj = {}
        if (this.phenotypeColors.size > 0) {
            obj.phenotypes = Array.from(this.phenotypeColors.keys())
        }
        if(this.snps.size > 0) {
            obj.snps = Array.from(this.snps)
        }
        if(this.qtl) {
            obj.qtl = this.qtl
        }
        return obj
    }

    static fromJSON(json) {
        const qtlSelections = new QTLSelections()
        if(json.phenotypes) {
            for(let g of json.phenotypes) {
                qtlSelections.addPhenotype(g)
            }
        }
        if(json.snps) {
            for(let s of json.snps) {
                qtlSelections.addSnp(s)
            }
        }
        if(json.qtl) {
            qtlSelections.qtl = json.qtl
        }
        return qtlSelections
    }
}

function compareQTLs(a, b) {
    return a.chr === b.chr && a.start === b.start && a.pValue === b.pValue
}

const brewer = []
// Set +!
brewer.push("rgb(228,26,28)")
brewer.push("rgb(55,126,184)")
brewer.push("rgb(77,175,74)")
brewer.push("rgb(166,86,40)")
brewer.push("rgb(152,78,163)")
brewer.push("rgb(255,127,0)")
brewer.push("rgb(247,129,191)")
brewer.push("rgb(255,255,51)")

// #Set 2
brewer.push("rgb(102,194,165)")
brewer.push("rgb(252,141,98)")
brewer.push("rgb(141, 160, 203)")
brewer.push("rgb(231, 138, 195)")
brewer.push("rgb(166, 216, 84)")
brewer.push("rgb(255, 217, 47)")
brewer.push("rgb(229, 196, 148)")

//#Set 3
brewer.push("rgb( 141, 211, 199)")
brewer.push("rgb(255, 255, 179)")
brewer.push("rgb(190, 186, 218)")
brewer.push("rgb(251, 128, 114)")
brewer.push("rgb(128, 177, 211)")
brewer.push("rgb(253, 180, 98)")
brewer.push("rgb(179, 222, 105)")
brewer.push("rgb(252, 205, 229)")
brewer.push("rgb(188, 128, 189)")
brewer.push("rgb(204, 235, 197)")
brewer.push("rgb(255, 237, 111)")


export default QTLSelections
