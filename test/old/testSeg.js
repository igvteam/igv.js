function runSegUnitTests() {

    asyncTest("SEG query", function () {

        var url = "http://data.broadinstitute.org/igvdata/test/igv-web/segmented_data_080520.seg.gz",
            featureSource = new igv.FeatureSource( { type: 'seg', url: url, indexed: false }),
            chr = "1",
            bpStart = 0,
            bpEnd = 747751863;

        featureSource.getFeatures(chr, bpStart, bpEnd, function (features) {

            ok(features);

            equal(features.length, 1438);

            // Test 1 feature, insure its on chr1
            var c = features[0].chr;
            equal(chr, c);

            start();
        }, undefined);

    });
    
}