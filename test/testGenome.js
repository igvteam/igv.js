import "./utils/mockObjects.js"
import GenomeUtils from "../js/genome/genome.js"
import {assert} from 'chai'
import BWReader from "../js/bigwig/bwReader.js"
import {loadCytobandsBB} from "../js/genome/cytoband.js"

suite("testGenome", function () {

    test("Genome coordinates", async function () {

        this.timeout(200000)

        const reference = {
            id: "hg19",
            fastaURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/1kg_v37/human_g1k_v37_decoy.fasta",
            cytobandURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/b37/b37_cytoband.txt",
            wholeGenomeView: false
        }

        const genome = await GenomeUtils.loadGenome(reference)
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
        const {cytobands, chromosomes} = await loadCytobandsBB(url, {})

        assert.equal(23, Object.keys(cytobands).length)
        assert.equal(23, chromosomes.size)
        const chr1 = chromosomes.get("chr1")
        assert.equal(248387328, chr1.bpLength)

    })
})
