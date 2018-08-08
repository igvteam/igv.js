function runGFFTests() {

    // mock object
    if (igv === undefined) {
        igv = {};
    }

    igv.browser = {
        getFormat: function () {
        },

        genome: {
            getChromosome: function (chr) {
            },
            getChromosomeName: function (chr) {
                return chr
            }
        }
    };

    asyncTest("GFF query", function () {

        var chr = "chr1",
            bpStart = 1,
            bpEnd = 10000,
            featureSource = new igv.FeatureSource({
                url: 'data/gff/eden.gff',
                format: 'gff3'
            });

        featureSource.getFeatures(chr, bpStart, bpEnd).then(function (features) {

            ok(features);
            equal(3, features.length);
            equal(chr, features[0].chr); // ensure features chromosome is specified chromosome

            start();
        })
            .catch(function (error) {
                console.log(error);
                ok(false);
                start();
            });
    });
}
