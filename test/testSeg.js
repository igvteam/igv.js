import FeatureSource from "../js/feature/featureSource.js";
import GenomeUtils from "../js/genome/genome.js";

function runSegTests() {

    var dataURL = "https://data.broadinstitute.org/igvdata/test/data/";

    const genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }

    // eweitz 2018-09-05:  Disabling this test for now, as it consistently fails.
    //
    QUnit.test("SEG query", function (assert) {

        const done = assert.async();
        const url = dataURL + "seg/segmented_data_080520.seg.gz";
        const featureSource = new FeatureSource(
            {format: 'seg', url: url, indexed: false},
            genome);
        const chr = "chr1";
        const bpStart = 0;
        const bpEnd = 747751863;

        featureSource.getFeatures(chr, bpStart, bpEnd)
            .then(function (features) {
                assert.ok(features);
                assert.equal(features.length, 1438);
                // Test 1 feature, insure its on chr1
                const c = genome.getChromosomeName(features[0].chr);
                assert.equal(chr, c);
                done();
            })

    })


    QUnit.test("SEG whole genome", function (assert) {

        var done = assert.async();


        var reference = {
            id: "hg19",
            fastaURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/1kg_v37/human_g1k_v37_decoy.fasta",
            cytobandURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/b37/b37_cytoband.txt"
        };

        GenomeUtils.loadGenome(reference)
            .then(function (genome) {

                const url = dataURL + "seg/segmented_data_080520.seg.gz";
                const featureSource = new FeatureSource({format: 'seg', url: url, indexed: false}, genome);
                const chr = "all";
                return featureSource.getFeatures(chr)
            })
            .then(function (features) {
                assert.ok(features);
                assert.equal(20076, features.length);
                var c = features[0].realChr;
                assert.equal("1", c);
                done();
            })
    })
}

export default runSegTests;
