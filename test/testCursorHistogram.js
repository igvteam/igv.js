/**
 * Created by turner on 2/24/14.

*/

function runCursorHistogramTests() {

    test( "CursorHistogram Creation Test", 4, function() {

        var cursorHistogram = new cursor.CursorHistogram(null, 100);
        ok(cursorHistogram);

        equal(0, cursorHistogram.scoreIndex(14));
        cursorHistogram.bins[cursorHistogram.scoreIndex(14)]++;

        equal(1, cursorHistogram.scoreIndex(35));
        cursorHistogram.bins[cursorHistogram.scoreIndex(35)]++;

        equal(2, cursorHistogram.scoreIndex(65));
        cursorHistogram.bins[cursorHistogram.scoreIndex(65)]++;

        cursorHistogram.bins.forEach(function(count, index, counts) {

            console.log("index " + index + " count " + count);
        });

    });

    asyncTest("CursorRegion - Lots of scores", function () {

        var peakURL = "../test/data/cursor/wgEncodeBroadHistoneH1hescH3k4me3StdPk.broadPeak.gz",
            tssURL = "../test/data/cursor/hg19.tss.bed.gz",
            featureSource,
            cursorModel = new cursor.CursorModel(null),
            bins,
            maxScore,
            cursorHistogram;

        featureSource = new igv.BedFeatureSource(peakURL);
//        featureSource = new igv.BedFeatureSource(tssURL);

        maxScore = 1000;
        cursorHistogram = new cursor.CursorHistogram(null, maxScore);

        featureSource.allFeatures(function (features) {

            ok(features);

            cursorModel.setRegions(features);

            featureSource.getFeatureCache(function (featureCache) {

                cursorModel.regions.forEach(function (region) {

                    var score = region.getScore(featureCache, region.regionWidth);

                    if (score < 0) {

                        // do nothing
                    } else {

                        cursorHistogram.bins[ cursorHistogram.scoreIndex(score) ] += 1;
                    }

                });

                cursorHistogram.bins.forEach(function(count, index, counts) {

                    console.log("bin[" + index + "] = " + count);
                });

                start();
            });
        });


    });

//    asyncTest("CursorRegion - getScore", function () {
//
//        var tssUrl = "../test/data/cursor/hg19.tss.bed.gz",
//            peakURL = "../test/data/cursor/wgEncodeBroadHistoneH1hescH3k4me3StdPk.broadPeak.gz",
//            tssDataSource,
//            peakDataSource,
//            region,
//            cursorModel;
//
//        peakDataSource = new igv.BedFeatureSource(peakURL);
//        tssDataSource = new igv.BedFeatureSource(tssUrl);
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
