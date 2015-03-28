/**
 * Created by turner on 2/13/14.
 */
function runWIGFeatureSourceTests() {

    asyncTest("wig fixed step", function () {

        var path = "data/wig/fixedStep-example.wig",
            featureSource = new igv.FeatureSource({ type : 'wig', url: path }),
            chr = "chr19",
            bpStart = 49300000,
            bpEnd   = 49400000;

        ok(featureSource, "featureSource");

        featureSource.getFeatures(chr, bpStart, bpEnd, function (features) {

            //fixedStep chrom=chr19 start=49307401 step=300 span=200
            var ss = 49307401,
                step = 300,
                span = 200,
                value = 1000;

            ok(features);
            equal(features.length, 10);

            //features.forEach(function (feature) {
            //
            //    equal(feature.start, ss);
            //    equal(feature.end, ss + span);
            //    equal(feature.value, value);
            //
            //    ss += step;
            //    value -= 100;
            //
            //});

            start();
        }, undefined);


    });

    //asyncTest("wig variable step", function () {
    //
    //    var url = "data/wig/variableStep-example.wig";
    //
    //    var wigFeatureSource = new igv.FeatureSource({url: url});
    //
    //    ok(wigFeatureSource);
    //
    //    //variableStep chrom=chr19 span=150
    //    var starts = [49304701, 49304901, 49305401, 49305601, 49305901, 49306081, 49306301, 49306691, 49307871];
    //    var values = [10.0, 12.5, 15.0, 17.5 , 20.0, 17.5, 15.0, 12.5, 10.0];
    //    span = 150;
    //
    //    var chr = "chr19";
    //    var bpStart = 49304200;
    //    var bpEnd = 49310700;
    //
    //    wigFeatureSource.getFeatures(chr, bpStart, bpEnd, function (features) {
    //
    //        ok(features);
    //
    //        equal(features.length, 9);
    //
    //        //fixedStep chrom=chr19 start=49307401 step=300 span=200
    //        features.forEach(function (feature, index) {
    //
    //            equal(feature.start, starts[index]);
    //            equal(feature.end, starts[index] + span);
    //            equal(feature.value, values[index]);
    //
    //        });
    //        start();
    //    });
    //
    //
    //});

}