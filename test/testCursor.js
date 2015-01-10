function runCursorTests() {

    asyncTest("Get all features", function () {

        var peakURL,
            featureSource;

        peakURL = "data/peak/test.broadPeak";

        featureSource = new igv.BedFeatureSource({ type: 'bed', url: peakURL });
        featureSource.allFeatures(function (features) {

            ok(features);
            equal(features.length, 100);

            start();
        });


        //featureSource.getFeatureCache(function (featureCache) {
        //
        //    var region,
        //        regionWidth,
        //        score;
        //
        //    region = new cursor.CursorRegion({chr: "chr22", start: 16847690, end: 16857344});
        //    regionWidth = 16857344 - 16847690;
        //
        //    score = region.getScore(featureCache, regionWidth);
        //    console.log("Score=" + score);
        //
        //    start();
        //});


    });

    asyncTest("Get features in range", function () {

        var peakURL,
            featureSource;

        peakURL = "data/peak/test.broadPeak";

        featureSource = new igv.BedFeatureSource({ type: 'bed', url: peakURL });

        featureSource.getFeatures("chr22", 16847690, 16857344, function (features) {

            features.forEach(function(f, i, fs){

                console.log(i + " " + igv.numberFormatter(16847690) + " " + igv.numberFormatter(f.start) + " " + igv.numberFormatter(f.end) + " " + igv.numberFormatter(16857344));
            });

            ok(features);
            equal(features.length, 4); // determined from starting at file.

            start();
        });


    });

    asyncTest("Get features in range", function () {

        var peakURL,
            featureSource;

        peakURL = "data/peak/test.broadPeak";

        featureSource = new igv.BedFeatureSource({ type: 'bed', url: peakURL });

        featureSource.getFeatureCache(function (featureCache) {

            var cursorRegion,
                regionWidth,
                score;

            ok(featureCache);
            /*

            The cursorRegion bounds the first 5 rows of test.broadPeak

            chr22	16847690	16857344	.	354	.	5.141275	14.1	-1
            chr22	16849961	16850402	.	530	.	11.891913	13.6	-1
            chr22	16850687	16850928	.	1000	.	38.081260	15.7	-1
            chr22	16856352	16856575	.	526	.	11.758595	3.9	-1
            chr22	16858350	16858617	.	476	.	9.820849	3.0	-1
            */

            cursorRegion = new cursor.CursorRegion({chr: "chr22", start: 16847690, end: 16857344});
            regionWidth = 16857344 - 16847690;

            score = cursorRegion.getScore(featureCache, regionWidth);
            equal(score, 1000); // The heighest score in the region is 1000

            start();
        });


    });

//    asyncTest("Get allscores ", function () {
//
//        var tssUrl, peakURL, tssDataSource, peakDataSource, region, bpStart, bpEnd, len, cursorModel;
//
//        tssUrl = "http://www.broadinstitute.org/igvdata/public/test/data/cursor/hg19.tss.bed.gz";
//        peakURL = "http://www.broadinstitute.org/igvdata/public/test/data/cursor/wgEncodeBroadHistoneH1hescH3k4me3StdPk.broadPeak.gz";
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
//        tssUrl = "http://www.broadinstitute.org/igvdata/public/test/data/cursor/hg19.tss.bed.gz";
//        peakURL = "http://www.broadinstitute.org/igvdata/public/test/data/cursor/wgEncodeBroadHistoneH1hescH3k4me3StdPk.broadPeak.gz";
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
