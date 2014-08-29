/**
 * Created by turner on 2/13/14.
 */
function runWIGFeatureSourceTests() {

    test("WIGFeatureSource Construction", 2, function () {

        var url = "../assets/hg19/variableStep.wig";
        var wigFeatureSource = new igv.WIGFeatureSource(url);
        ok(wigFeatureSource, "wigFeatureSource should be non null");
        ok(wigFeatureSource.url, "wigFeatureSource.url should be non null");

    });

    test("WIGFeatureSource isVariableStep", 2, function () {

        var url = "../this/is/unused.foo";

        var wigFeatureSource = new igv.WIGFeatureSource(url);
        ok(wigFeatureSource, "wigFeatureSource should be non null");

        var result = wigFeatureSource.isVariableStep("variableStep");
        ok(result);

    });

    test("WIGFeatureSource isFixedStep", 2, function () {

        var url = "../this/is/unused.foo";

        var wigFeatureSource = new igv.WIGFeatureSource(url);
        ok(wigFeatureSource, "wigFeatureSource should be non null");

        var result = wigFeatureSource.isFixedStep("fixedStep");
        ok(result);

    });

    asyncTest("WIGFeatureSource getFeatures", 3, function () {

//        var url = "../assets/hg19/heart.SLC25A3.wig";
        var url = "../assets/hg19/variableStep.wig";
//        var url = "../assets/hg19/fixedStep.wig";
        var wigFeatureSource = new igv.WIGFeatureSource(url);
        ok(wigFeatureSource, "wigFeatureSource should be non null");

        var noop = function noop(features) {

            ok(features, "featureContainer.features should be non null");
            notEqual(features.length, 0, "feature list length is > 0");
            console.log("features", features.length);

            //
            start();
        }

        var chr = "chr12";
        var bpStart = 0;
        var bpEnd = 2400000;

        wigFeatureSource.getFeatures(chr, bpStart, bpEnd, noop);
    });

}