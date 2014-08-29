function runCursorTests() {
//Users/jrobinso/projects/igv-js/igv/test/data/cursor/wgEncodeBroadHistoneH1hescH3k4me3StdPk.broadPeak

    module("Cursor");

    asyncTest("Get score ", function () {

        var peakURL,
            peakDataSource;

        peakURL = "../test/data/cursor/wgEncodeBroadHistoneH1hescH3k27me3StdPk.broadPeak.gz";

        peakDataSource = new igv.BedFeatureSource(peakURL);
        peakDataSource.getFeatureCache(function (featureCache) {

            var region = new cursor.CursorRegion({chr: "chr1", start: 145549209, end: 145549209}),
                regionWidth = 100;

            var score = region.getScore(featureCache, regionWidth);
            console.log("Score=" + score);

            start();
        });


    });

//    asyncTest("Get allscores ", function () {
//
//        var tssUrl, peakURL, tssDataSource, peakDataSource, region, bpStart, bpEnd, len, cursorModel;
//
//        tssUrl = "../test/data/cursor/hg19.tss.bed.gz";
//        peakURL = "../test/data/cursor/wgEncodeBroadHistoneH1hescH3k4me3StdPk.broadPeak.gz";
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
//                console.log("Score=" + score);
//
//                start();
//            });
//        });
//
//    });

//    asyncTest("Sort ", function () {
//
//        var tssUrl, peakURL, tssDataSource, peakDataSource, region, bpStart, bpEnd, len, cursorModel;
//
//        tssUrl = "../test/data/cursor/hg19.tss.bed.gz";
//        peakURL = "../test/data/cursor/wgEncodeBroadHistoneH1hescH3k4me3StdPk.broadPeak.gz";
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
//
//            cursorModel.sortRegions(peakDataSource, 1, function (regions) {
//
//                ok(regions);
//
//                start();
//            });
//        });
//
//    });


}
