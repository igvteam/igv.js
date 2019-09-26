import FeatureSource from "../js/feature/featureSource.js";

function runWigTests() {


    //mock object

    const genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }

    QUnit.test("wig fixed step", function(assert) {
				var done = assert.async();

        var path = "data/wig/fixedStep-example.wig",
            featureSource = new FeatureSource(
                {format: 'wig', url: path},
                genome),
            chr = "chr19",
            bpStart = 49300000,
            bpEnd = 49400000;

        assert.ok(featureSource, "featureSource");

        featureSource.getFeatures(chr, bpStart, bpEnd).then(function (features) {
            assert.ok(features);
            assert.equal(features.length, 10);

            //fixedStep chrom=chr19 start=49307401 step=300 span=200
            // fixedStep uses 1-based coordinate, igv.js uses 0-based
            assert.equal(features[0].start, 49307400);
            assert.equal(features[0].end - features[0].start, 200);
            assert.equal(features[1].start - features[0].start, 300);

            done();
        }).catch(function (error) {
            console.log(error);
            assert.ok(false);
        });
    });

    QUnit.test("wig variable step", function(assert) {
				var done = assert.async();

        var url = "data/wig/variableStep-example.wig";

        var wigFeatureSource = new FeatureSource(
            {format: 'wig', url: url},
            genome);

        assert.ok(wigFeatureSource);

        //variableStep chrom=chr19 span=150
        var wigStarts = [49304701, 49304901, 49305401, 49305601, 49305901, 49306081, 49306301, 49306691, 49307871];
        var values = [10.0, 12.5, 15.0, 17.5, 20.0, 17.5, 15.0, 12.5, 10.0];
        const span = 150;

        var chr = "chr19";
        var bpStart = 49304200;
        var bpEnd = 49310700;

        wigFeatureSource.getFeatures(chr, bpStart, bpEnd).then(function (features) {

            assert.ok(features);

            assert.equal(features.length, 9);

            //fixedStep chrom=chr19 start=49307401 step=300 span=200
            features.forEach(function (feature, index) {

                assert.equal(feature.start, wigStarts[index] - 1);
                assert.equal(feature.end, wigStarts[index] - 1 + span);
                assert.equal(feature.value, values[index]);

            });
            done();
        }).catch(function (error) {
            console.log(error);
            assert.ok(false);
        });
    });
}

export default runWigTests;
