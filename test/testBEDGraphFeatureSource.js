/**
 * Created by turner on 2/13/14.
 */
function runBEDGraphFeatureSourceTests() {

    test("WIGFeatureSource Construction", 2, function () {

        var url = "../test/data/random_5000_lo_0dot1_hi_1.wig";
        var wigFeatureSource = new igv.WIGFeatureSource(url);
        ok(wigFeatureSource, "wigFeatureSource should be non null");
        ok(wigFeatureSource.url, "wigFeatureSource.url should be non null");

    });

    asyncTest("WIGFeatureSource getFeatures", 3, function () {

        var url = "../test/data/random_5000_lo_0dot1_hi_1.wig";
        var wigFeatureSource = new igv.WIGFeatureSource(url);
        ok(wigFeatureSource, "wigFeatureSource should be non null");

        var noop = function noop(featureDictionary) {

            ok(featureDictionary, "featureContainer.features should be non null");
            notEqual(featureDictionary.featureList.length, 0, "feature list length is > 0");

            console.log("featureList.length " + featureDictionary.featureList.length);

            //
            start();
        };

        var chr = "chr19";
        var bpStart = 9917384;
        var bpEnd  = 14917884;

        wigFeatureSource.getFeatures(chr, bpStart, bpEnd, noop);
    });

}