function runBEDUnitTests() {

    asyncTest("BED query", function () {

        var chr = "chr1",
            bpStart = 67655271,
            bpEnd   = 67684468,
            featureSource = new igv.FeatureSource({
                type: 'bed',
                url: 'data/bed/basic_feature_3_columns.bed'
            });

        featureSource.getFeatures(chr, bpStart, bpEnd, function (features) {

            ok(features);
            equal(128, features.length);   // feature count. Determined by grepping file
            equal(chr, features[ 0 ].chr); // ensure features chromosome is specified chromosome

            start();
        }, undefined);

    });

    asyncTest("BED all features", function () {

        var featureSource = new igv.FeatureSource({
                type: 'bed',
                url: 'data/bed/basic_feature_3_columns.bed'
            });

        featureSource.allFeatures(function (features) {

            ok(features);
            equal(128, features.length);   // feature count. Determined by grepping file

            start();
        });

    });

    asyncTest("BED query gzip", function () {

        var chr = "chr1",
            bpStart = 67655271,
            bpEnd   = 67684468,
            featureSource = new igv.FeatureSource({
                type: 'bed',
                url: 'data/bed/basic_feature_3_columns.bed.gz'
            });

        featureSource.getFeatures(chr, bpStart, bpEnd, function (features) {

            ok(features);
            equal(128, features.length);   // feature count. Determined by grepping file
            equal(chr, features[ 0 ].chr); // ensure features chromosome is specified chromosome

            start();
        }, undefined);

    });

    asyncTest("broadPeak parsing ", function () {

        var featureSource,
            chr,
            bpStart,
            bpEnd;

        featureSource = new igv.FeatureSource({
            type: 'broadPeak',
            url: "data/peak/test.broadPeak"
        });

        chr = "chr22";
        bpStart = 16847690;
        bpEnd = 20009819;
        featureSource.getFeatures(chr, bpStart, bpEnd, function (features) {

            var feature;

            ok(features);
            equal(features.length, 100);   // # of features over this region

            feature = features[0];
            equal(chr, feature.chr);

            equal(feature.start, 16847690);
            ok(feature.end > bpStart);
            equal(feature.signal, 5.141275);

            start();

        }, undefined);

    });

//
//    test( "UCSC track line", 2, function() {
//
//        var trackLine = 'track name="My Track" color=(0,0,0)';
//
//        var trackProperties = igv.ucsc.parseTrackLine(trackLine);
//
//        equal('My Track', trackProperties["name"]);
//        equal('(0,0,0)', trackProperties["color"]);
//
//    });

}