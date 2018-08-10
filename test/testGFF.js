function runGFFTests() {

    // mock object

    const genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }

    asyncTest("GFF query", function () {

        var chr = "chr1",
            bpStart = 1,
            bpEnd = 10000,
            featureSource = new igv.FeatureSource({
                    url: 'data/gff/eden.gff',
                    format: 'gff3'
                },
                genome);

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
