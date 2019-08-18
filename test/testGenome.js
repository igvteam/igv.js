import GenomeUtils from "../js/genome/genome.js";

function runGenomeTests() {

    QUnit.test("Genome coordinates", function (assert) {
        var done = assert.async();

        var reference = {
                id: "hg19",
                fastaURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/1kg_v37/human_g1k_v37_decoy.fasta",
                cytobandURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/b37/b37_cytoband.txt"
            };

        GenomeUtils.loadGenome(reference).then(function (genome) {
            assert.ok(genome);
            assert.equal(86, genome.chromosomeNames.length);
            assert.equal(genome.getCumulativeOffset("2"), 249250621);
            done();
        }).catch(function (error) {
            assert.ok(false, error);  // failed
        });
    });
}

export default runGenomeTests;
