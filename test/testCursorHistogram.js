/**
 * Created by turner on 2/24/14.

*/

function runCursorHistogramTests() {

    test( "CursorHistogram Creation Test", 11, function() {


<<<<<<< HEAD
        var score,
            cursorHistogram = new cursor.CursorHistogram(null, null);
        ok(cursorHistogram);
=======
        featureSource = new igv.FeatureSource(peakURL);
//        featureSource = new igv.FeatureSource(tssURL);

        maxScore = 1000;
        cursorHistogram = new cursor.CursorHistogram(null, maxScore);

        featureSource.allFeatures(function (features) {

            ok(features);

            cursorModel.setRegions(features);

            featureSource.getFeatureCache(function (featureCache) {

                cursorModel.regions.forEach(function (region) {

                    var score = region.getScore(featureCache, region.regionWidth);

                    if (score < 0) {
>>>>>>> 42860ae42599bc23110e895035bcb5edee6a82ae

        // maximum track score is 100
        cursorHistogram.track = { max : 100 };

        // default bin count is 100
        equal(100, cursorHistogram.bins.length);

        // we have a "square histogram space"
        score = 0;

        [0, 25, 75].forEach(function(score, i, scores){

            var index;
            index = cursorHistogram.scoreIndex(score);
            equal(score, index);
            ok(index >= 0);
            ok(index < cursorHistogram.bins.length);
            cursorHistogram.bins[ index ]++;

        });


    });

//    asyncTest("CursorRegion - Lots of scores", function () {
//
//        var peakURL = "http://www.broadinstitute.org/igvdata/public/test/data/cursor/wgEncodeBroadHistoneH1hescH3k4me3StdPk.broadPeak.gz",
//            tssURL = "http://www.broadinstitute.org/igvdata/public/test/test/data/cursor/hg19.tss.bed.gz",
//            featureSource,
//            cursorModel = new cursor.CursorModel(null),
//            bins,
//            maxScore,
//            cursorHistogram;
//
//        featureSource = new igv.BedFeatureSource(peakURL);
////        featureSource = new igv.BedFeatureSource(tssURL);
//
//        maxScore = 1000;
//        cursorHistogram = new cursor.CursorHistogram(null, maxScore);
//
//        featureSource.allFeatures(function (features) {
//
//            ok(features);
//
//            cursorModel.setRegions(features);
//
//            featureSource.getFeatureCache(function (featureCache) {
//
//                cursorModel.regions.forEach(function (region) {
//
//                    var score = region.getScore(featureCache, region.regionWidth);
//
//                    if (score < 0) {
//
//                        // do nothing
//                    } else {
//
//                        cursorHistogram.bins[ cursorHistogram.scoreIndex(score) ] += 1;
//                    }
//
//                });
//
//                cursorHistogram.bins.forEach(function(count, index, counts) {
//
//                    console.log("bin[" + index + "] = " + count);
//                });
//
//                start();
//            });
//        });
//
//
//    });

//    asyncTest("CursorRegion - getScore", function () {
//
//        var tssUrl = "http://www.broadinstitute.org/igvdata/public/test/data/cursor/hg19.tss.bed.gz",
//            peakURL = "http://www.broadinstitute.org/igvdata/public/test/data/cursor/wgEncodeBroadHistoneH1hescH3k4me3StdPk.broadPeak.gz",
//            tssDataSource,
//            peakDataSource,
//            region,
//            cursorModel;
//
//        peakDataSource = new igv.FeatureSource(peakURL);
//        tssDataSource = new igv.FeatureSource(tssUrl);
//        cursorModel = new cursor.CursorModel(null);
//
//        tssDataSource.allFeatures(function (featureList) {
//
//            ok(featureList);
//
//            cursorModel.setRegions(featureList);
//            region = cursorModel.regions[1];
//
//
//            peakDataSource.getFeatureCache(function (featureCache) {
//
//                var regionWidth = 1000000;
//                var score = region.getScore(featureCache, regionWidth);
//                console.log("score " + score);
//
//                start();
//            });
//        });
//
//    });


}
