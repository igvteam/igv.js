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
            indexURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/1kg_v37/human_g1k_v37_decoy.fasta.fai",
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
            id: "GCF_000364345.1",
            format: "2bit",
            twoBitURL: "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/364/345/GCF_000364345.1/GCF_000364345.1.2bit",
            chromSizesURL: "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/364/345/GCF_000364345.1/GCF_000364345.1.chrom.sizes.txt"
        }

        const genome = await Genome.createGenome(reference)
        assert.ok(genome.chromosomes.size > 0)
        assert.ok(genome.chromosomeNames.length > 0)

    })


})
