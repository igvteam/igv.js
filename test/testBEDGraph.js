import FeatureSource from "../js/feature/featureSource.js";

function runBEDGraphTests() {


    //mock object
    const genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }

    QUnit.test("BEDGraphFeatureSource getFeatures", function (assert) {

        var done = assert.async();

        var chr = "chr19",
            bpStart = 49302001,
            bpEnd = 49304701,
            featureSource = new FeatureSource({
                    format: 'bedgraph',
                    url: 'data/wig/bedgraph-example-uscs.bedgraph'
                },
                genome);

        featureSource.getFeatures(chr, bpStart, bpEnd).then(function (features) {

            assert.ok(features);
            assert.equal(features.length, 9);

            //chr19	49302600	49302900	-0.50
            var f = features[2];
            assert.equal(f.chr, "chr19", "chromosome");
            assert.equal(f.start, 49302600, "start");
            assert.equal(f.end, 49302900, "end");
            assert.equal(f.value, -0.50, "value");

            done();
        }).catch(function (error) {
            console.log(error);
            assert.ok(false);
        });

    });
}

export default runBEDGraphTests;
