function runSegUnitTests() {

    asyncTest("SEG query", function () {

        var url = "http://www.broadinstitute.org/igvdata/test/igv-web/segmented_data_080520.seg.gz";

        var featureSource = new igv.FeatureSource( { type: 'seg', url: url, indexed: false } );

        var chr = "1";
        var bpStart = 0;
        var bpEnd = 747751863;

        featureSource.getFeatures(chr, bpStart, bpEnd, function (features) {

            ok(features);

            // Test 1 feature, insure its on chr1
            var c = features[0].chr;
            equal(chr, c);

            start();
        }, undefined);

    });

    //asyncTest("SEG all features", 2, function () {
    //
    //    var url = "http://www.broadinstitute.org/igvdata/test/igv-web/segmented_data_080520.seg.gz";
    //
    //    var bedDataSource = new igv.FeatureSource({url: url});
    //
    //
    //    bedDataSource.allFeatures(function (featureList) {
    //
    //        ok(featureList);
    //
    //        var len = featureList.length;
    //
    //        equal(len, 5001);
    //
    //
    //        start();
    //    });
    //
    //});


}