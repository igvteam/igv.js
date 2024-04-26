// Mock genome object, based on hg38
import ChromAliasDefaults from "../../js/genome/chromAliasDefaults.js"

// Chromosome sizes for hg38 genome, 1-24 + M
const sizes = [248956422, 242193529, 198295559, 190214555, 181538259, 170805979, 159345973, 145138636, 138394717,
    133797422, 135086622, 133275309, 114364328, 107043718, 101991189, 90338345, 83257441, 80373285, 58617616, 64444167,
    46709983, 50818468, 156040895, 57227415, 16569
]


class MockGenome {

    chromosomes = new Map()

    constructor(namingConvention = "ucsc") {

        const ucsc = namingConvention === "ucsc"

        this.id = ucsc ? "hg38" : "GRCh38"
        const chromosomeNames = []
        for (let i = 0; i < 25; i++) {
            let name
            if (i < 22) {
                name = ucsc ? `chr${i + 1}` : `${i + 1}`
            } else {
                switch (i) {
                    case 22:
                        name = ucsc ? "chrX" : "23"
                        break
                    case 23:
                        name = ucsc ? "chrY" : "24"
                        break
                    case 24:
                        name = ucsc ? "chrM" : "MT"

                }
            }
            chromosomeNames.push(name)
            this.chromosomes.set(name, {name, bpLength: sizes[i]})
        }

        this.wgChromosomeNames = chromosomeNames
        this.chromAlias = new ChromAliasDefaults(this.id, chromosomeNames)
    }

    getChromosome(chr) {
        if (this.chromAlias) {
            chr = this.chromAlias.getChromosomeName(chr)
        }
        return this.chromosomes.get(chr)
    }

    async getAliasRecord(chr) {
        return this.chromAlias.search(chr)
    }

    async loadChromosome(chr) {
        return this.getChromosome(chr)
    }

    getChromosomeName(chr) {
        return this.chromAlias.getChromosomeName(chr)
    }


    /**
     * Return the genome coordinate in kb for the give chromosome and position.
     * NOTE: This might return undefined if the chr is filtered from whole genome view.
     */
    getGenomeCoordinate(chr, bp) {

        var offset = this.getCumulativeOffset(chr)
        if (offset === undefined) return undefined

        return offset + bp
    }

    getGenomeLength() {
        return [...this.chromosomes.values()].reduce((acc, c) => acc + c.bpLength, 0)
    }

    /**
     * Return the offset in genome coordinates (kb) of the start of the given chromosome
     * NOTE:  This might return undefined if the chromosome is filtered from whole genome view.
     */
    getCumulativeOffset(chr) {

        if (this.cumulativeOffsets === undefined) {
            let acc = {}
            let offset = 0
            for (let name of this.wgChromosomeNames) {
                acc[name] = Math.floor(offset)
                const chromosome = this.getChromosome(name)
                offset += chromosome.bpLength
            }
            this.cumulativeOffsets = acc
        }

        const queryChr = this.getChromosomeName(chr)
        return this.cumulativeOffsets[queryChr]


    }


}

/**
 *
 * @param namingConvention -- chromosome naming convention, either "ucsc" or "ncbi"
 * @returns mock genome object
 */
function createGenome(namingConvention = "ucsc") {
    return new MockGenome(namingConvention)
}

export {createGenome}

