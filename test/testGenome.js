import "./utils/mockObjects.js"
import GenomeUtils from "../js/genome/genomeUtils.js"
import {assert} from 'chai'
import CytobandFileBB from "../js/genome/cytobandFileBB.js"


suite("testGenome", function () {

    test("Genome coordinates", async function () {

        this.timeout(200000)

        const reference = {
            id: "hg19",
            fastaURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/1kg_v37/human_g1k_v37_decoy.fasta",
            cytobandURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/b37/b37_cytoband.txt",
            wholeGenomeView: false
        }

        const genome = await Genome.loadGenome(reference)
        assert.ok(genome)
        assert.equal(86, genome.chromosomeNames.length)
        assert.equal(genome.getCumulativeOffset("2"), 249250621)

    })

    /**
     * test parsing a cytoband BB file from the T2T hub
     * Example feature
     * {
     *   "chr": "chr1",
     *   "start": 0,
     *   "end": 1735965,
     *   "name": "p36.33",
     *   "gieStain": "gneg"
     * }
     */
    test("test cytoband bigbed", async function () {

        const url = "test/data/bb/cytoBandMapped.bb"
        const src = new CytobandFileBB(url)

        const cytobands = await src.getCytobands("chr1")
        const last = cytobands[cytobands.length-1];
        assert.equal(248387328, last.end)

    })
})
