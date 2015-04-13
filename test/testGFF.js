function runGFFUnitTests() {

    asyncTest("GFF query", function () {

        var chr = "ctg123",
            bpStart = 1,
            bpEnd   = 10000,
            featureSource = new igv.FeatureSource({

                url: 'data/gff/eden.gff'
            });

        featureSource.getFeatures(chr, bpStart, bpEnd, function (features) {

            ok(features);
            equal(23, features.length);   // feature count. Determined by grepping file
            equal(chr, features[ 0 ].chr); // ensure features chromosome is specified chromosome

            start();
        }, undefined);

    });

}