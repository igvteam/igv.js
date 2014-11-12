function runSegUnitTests() {

    module("SEG");

    asyncTest("SEG query", 3, function () {

        var url = "data/seg/sample_hg18.seg";

        var bedDataSource = new igv.BedFeatureSource({url: url});

        var chr = "23";
        var bpStart = 0;
        var bpEnd = Number.MAX_VALUE;
        bedDataSource.getFeatures(chr, bpStart, bpEnd, function (featureList) {

            ok(featureList);

            var len = featureList.length;

            equal(307, len);   // # of features on chr 1 (determined by greping file)

            // Test 1 feature, insure its on chr1
            var c = featureList[0].chr;
            equal(chr, c);

            start();
        });

    });

    asyncTest("SEG all features", 2, function () {

        var url = "data/seg/sample_hg18.seg";

        var bedDataSource = new igv.BedFeatureSource({url: url});


        bedDataSource.allFeatures(function (featureList) {

            ok(featureList);

            var len = featureList.length;

            equal(len, 5001);


            start();
        });

    });


}