import "./utils/mockObjects.js"
import Genome from "../js/genome/genome.js"
import {assert} from 'chai'
import CytobandFileBB from "../js/genome/cytobandFileBB.js"


suite("testGenome", function () {

    test("Genome coordinates", async function () {

        this.timeout(200000)

        const reference = {
            id: "hg19",
            fastaURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/1kg_v37/human_g1k_v37_decoy.fasta",
            cytobandURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/b37/b37_cytoband.txt",
            wholeGenomeView: true
        }

        const genome = await Genome.createGenome(reference)
        assert.ok(genome)
        assert.equal(86, genome.chromosomeNames.length)
        assert.equal(genome.getCumulativeOffset("2"), 249250621)

    })

    test("2bit genome with chromSizes", async function() {

        this.timeout(400000)

        const reference = {
            id: "GCF_016699485.2",
            format: "2bit",
            twoBitURL: "https://hgdownload.gi.ucsc.edu/hubs//GCA/011/100/615/GCA_011100615.1/GCA_011100615.1.2bit",
            chromSizes: "https://hgdownload.gi.ucsc.edu/hubs//GCA/011/100/615/GCA_011100615.1/GCA_011100615.1.chrom.sizes.txt"
        }

        const genome = await Genome.createGenome(reference)
        assert.ok(genome.chromosomes.size > 0)
        assert.ok(genome.chromosomeNames.length > 0)

    })


})
