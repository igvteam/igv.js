function runIntervalTreeTests() {

    module("Interval Tree");

    //test("Point search", function () {
    //
    //    var tree = new igv.IntervalTree();
    //    tree.insert(19, 20, 8);
    //    tree.insert(25, 30, 9);
    //    tree.insert(0, 3, 1);
    //    tree.insert(5, 8, 2);
    //    tree.insert(6, 10, 3);
    //    tree.insert(8, 9, 4);
    //    tree.insert(15, 23, 5);
    //    tree.insert(16, 21, 6);
    //    tree.insert(17, 19, 7);
    //    tree.insert(26, 27, 10);
    //
    //    tree.logIntervals();
    //
    //    var queryInterval = {low: 4, high: 7};
    //
    //    var intervals = tree.findOverlapping(queryInterval.low, queryInterval.high);
    //    ok(intervals);
    //    equal(intervals.length, 2);
    //
    //    intervals.forEach(function (iv) {
    //        ok(iv.overlaps(queryInterval));
    //    });
    //
    //});

    asyncTest("Query peak features ", function () {

        var url = "data/peak/test.broadPeak",
            featureSource;

        featureSource = new igv.BedFeatureSource({ type: 'bed', url: url });
        ok(featureSource);

        //start();

        featureSource.allFeatures(function(featureList) {

            var length = featureList.length;

            ok(featureList);
            ok(length);
            //equal(featureList.length, 2);

            start();

        });

        //featureSource.getFeatures("chr19", igv.numberUnFormatter("49,302,001"), igv.numberUnFormatter("49,304,701"), function(featureList) {
        //
        //    ok(featureList);
        //    //equal(featureList.length, 2);
        //
        //    start();
        //
        //}, undefined);


    });


}