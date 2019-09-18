import FeatureSource from "../js/feature/featureSource.js";

function runAedTests() {

    const genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }

    QUnit.test("AED - UTF8 with BOM", function (assert) {

        var done = assert.async();

        var chr = "chr2",
            bpStart = 0,
            bpEnd = Number.MAX_VALUE,
            featureSource = new FeatureSource({
                format: 'aed',
                indexed: false,
                url: 'data/aed/utf8-bom.aed'
            },
            genome);

        // Must get file header first
        featureSource.getFeatures(chr, bpStart, bpEnd)
            .then(function (features) {

                assert.equal(features.length, 1);

                assert.equal(features[0].aed.metadata.affx.ucscGenomeVersion.value, "hg19");
                assert.equal(features[0].aed.columns[14].name, "note");

                assert.equal(features[0].name, "CNNM3");
                assert.equal(features[0].cdStart, null); // Missing value
                assert.equal(features[0].allColumns[14], "Test unicode:\r" +
                                                  "∞\r" +
                                                  "☃\r" +
                                                  "(infinity snowman)");
                assert.equal(features[0].strand, "+");

                done();
            })
            .catch(function (error) {
                console.log(error);
            });
    });
}

export default runAedTests;