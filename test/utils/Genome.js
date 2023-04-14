// Mock genome object, based on hg38
import Genome from "../../js/genome/genome.js"

const sizes = {
    chr1: 248956422,
    chr2: 242193529,
    chr3: 198295559,
    chr4: 190214555,
    chr5: 181538259,
    chr6: 170805979,
    chr7: 159345973,
    chr8: 145138636,
    chr9: 138394717,
    chr10: 133797422,
    chr11: 135086622,
    chr12: 133275309,
    chr13: 114364328,
    chr14: 107043718,
    chr15: 101991189,
    chr16: 90338345,
    chr17: 83257441,
    chr18: 80373285,
    chr19: 58617616,
    chr20: 64444167,
    chr21: 46709983,
    chr22: 50818468,
    chrX: 156040895,
    chrY: 57227415,
    chrM: 16569
}

function createGenome() {
    return {

        id: "hg38",

        getChromosomeName: function (chr) {
            return chr.toLowerCase() === "all" ? "all" :
                chr.startsWith("chr") ? chr : "chr" + chr
        },

        getChromosome: function (chr) {

            const name = this.getChromosomeName(chr)
            const bpLength = sizes[name]
            return bpLength ? {name, bpLength} : undefined
        },

        wgChromosomeNames: Object.keys(sizes),

        featureDB: new Map(),

        addFeaturesToDB: function (featureList, config) {

            const insertFeature = (name, feature) => {
                const current = this.featureDB.get(name)
                if (current) {
                    feature = (feature.end - feature.start) > (current.end - current.start) ? feature : current

                }
                this.featureDB.set(name, feature)
            }

            for (let feature of featureList) {
                if (feature.name) {
                    insertFeature(feature.name.toUpperCase(), feature)
                }
                if (feature.gene && feature.gene.name) {
                    insertFeature(feature.gene.name.toUpperCase(), feature)
                }

                if (config.searchableFields) {
                    for (let f of config.searchableFields) {
                        const value = feature.getAttributeValue(f)
                        if (value) {
                            if (value.indexOf(" ") > 0) {
                                insertFeature(value.replaceAll(" ", "+").toUpperCase(), feature)
                            } else {
                                insertFeature(value.toUpperCase(), feature)
                            }
                        }
                    }
                }
            }
        }

    }
}

export {createGenome}

