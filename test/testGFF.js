import FeatureSource from "../js/feature/featureSource.js";

function runGFFTests() {

    // mock object

    const genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }

    QUnit.test("GFF query", function(assert) {
				var done = assert.async();

        var chr = "chr1",
            bpStart = 1,
            bpEnd = 10000,
            featureSource = new FeatureSource({
                    url: 'data/gff/eden.gff',
                    format: 'gff3',
                    filterTypes: []
                },
                genome);

        featureSource.getFeatures(chr, bpStart, bpEnd).then(function (features) {

            assert.ok(features);
            assert.equal(5, features.length);
            assert.equal(chr, features[0].chr); // ensure features chromosome is specified chromosome

            done();
        })
            .catch(function (error) {
                console.log(error);
                assert.ok(false);
                done();
            });
    });
}

export default runGFFTests;
