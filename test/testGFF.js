import FeatureSource from "../js/feature/featureSource.js";

function runGFFTests() {

    // mock object

    const genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }

    QUnit.test("GFF query", function (assert) {
        var done = assert.async();

        const chr = "chr1";
        const bpStart = 1;
        const bpEnd = 10000;
        const featureSource = FeatureSource({
                url: 'data/gff/eden.gff',
                format: 'gff3',
                filterTypes: []
            },
            genome);

        featureSource.getFeatures(chr, bpStart, bpEnd).then(function (features) {
            assert.ok(features);
            assert.equal(4, features.length);
            assert.equal(chr, features[0].chr); // ensure features chromosome is specified chromosome

            done();
        })
            .catch(function (error) {
                console.log(error);
                assert.ok(false);
                done();
            });
    });

    QUnit.test("Multiline feature", async function (assert) {
        var done = assert.async();
        const featureSource = FeatureSource({
                url: 'data/gff/multi_line_feature.gff3',
                format: 'gff3'
            },
            genome);

        try {
            const chr1Features = await featureSource.getFeatures("chr1", 500000, 600000);
            assert.ok(chr1Features);
            assert.equal(1, chr1Features.length);
            assert.equal(5, chr1Features[0].exons.length); // ensure features chromosome is specified chromosome

            const chr2Features = await featureSource.getFeatures("chr1", 500000, 600000);
            assert.ok(chr2Features);
            assert.equal(1, chr2Features.length);
            assert.equal(5, chr2Features[0].exons.length); // ensure features chromosome is specified chromosome
        } catch (e) {
            console.log(e);
            assert.ok(false);
        } finally {
            done();
        }
    });
}

export default runGFFTests;
