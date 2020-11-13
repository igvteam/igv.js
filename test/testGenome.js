import "./utils/mockObjects.js"
import GenomeUtils from "../js/genome/genome.js";
import {assert} from 'chai';

suite("testGenome", function () {

    test("Genome coordinates", async function () {

        this.timeout(100000);

        const reference = {
            id: "hg19",
            fastaURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/1kg_v37/human_g1k_v37_decoy.fasta",
            cytobandURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/b37/b37_cytoband.txt"
        };

        const genome = await GenomeUtils.loadGenome(reference);
        assert.ok(genome);
        assert.equal(86, genome.chromosomeNames.length);
        assert.equal(genome.getCumulativeOffset("2"), 249250621);

    })
})
