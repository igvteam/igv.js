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

        var peakURL = "http://www.broadinstitute.org/igvdata/public/test/data/cursor/wgEncodeBroadHistoneH1hescH3k4me3StdPk.broadPeak.gz",
            tssURL = "http://www.broadinstitute.org/igvdata/public/test/test/data/cursor/hg19.tss.bed.gz",
            featureSource,
            cursorModel = new cursor.CursorModel(null),
            bins,
            maxScore,
            cursorHistogram;

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
