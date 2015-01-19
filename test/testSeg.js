function runSegUnitTests() {

    module("SEG");

    asyncTest("SEG query", 1, function () {

        var url = "http://www.broadinstitute.org/igvdata/test/igv-web/segmented_data_080520.seg.gz";

        var bedDataSource = new igv.FeatureSource( { url: url, indexed: false } );

        //var chr = "23";
        //var bpStart = 0;
        //var bpEnd = Number.MAX_VALUE;

        var chr = "1";
        var bpStart = 0;
        var bpEnd = 747751863;

        bedDataSource.getFeatures(chr, bpStart, bpEnd, function (featureList) {

            ok(featureList);

            //var len = featureList.length;
            //
            //equal(307, len);   // # of features on chr 1 (determined by greping file)
            //
            //// Test 1 feature, insure its on chr1
            //var c = featureList[0].chr;
            //equal(chr, c);

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