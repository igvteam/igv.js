function eqtlUnitTests() {

    asyncTest("EQTL binary file", function () {

        var path = "http://data.broadinstitute.org/igvdata/test/data/eqtl/Heart_Left_Ventricle.portal.eqtl.bin",
            featureSource,
            chr = "chr1",
            bpStart = 0,
            bpEnd = 2500000;

        featureSource = new igv.FeatureSource({ type: 'eqtl', url: path });
        ok(featureSource, "featureSource");

        featureSource.getFeatures(chr, bpStart, bpEnd, function (features) {

            var len;

            ok(features);

            len = features.length;

            equal(len, 5293);   // # of features on chr 1 (determined by greping file)

            start();
        }, undefined);

    });

}