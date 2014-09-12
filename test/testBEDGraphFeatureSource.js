/**
 * Created by turner on 2/13/14.
 */
function runBEDGraphFeatureSourceTests() {

    test("BEDGraphFeatureSource Construction", 2, function () {

        var url = "../test/data/bedgraph-example-uscs.bedgraph";
        var featureSource = new igv.BEDGraphFeatureSource(url);
        ok(featureSource, "featureSource should be non null");
        ok(featureSource.url, "featureSource.url should be non null");

    });

    asyncTest("WIGFeatureSource getFeatures", 3, function () {

        var url = "../test/data/bedgraph-example-uscs.bedgraph";
        var featureSource = new igv.BEDGraphFeatureSource(url);
        ok(featureSource, "featureSource should be non null");

        var noop = function noop(featureDictionary) {

            ok(featureDictionary, "featureContainer.features should be non null");

            notEqual(featureDictionary.featureList.length, 0, "feature list length is > 0");
            console.log("featureList.length " + featureDictionary.featureList.length);

            start();
        };

        var chr = "chr19";
        var bpStart = 49302001;
        var bpEnd  = 49304701;

        featureSource.getFeatures(chr, bpStart, bpEnd, noop);
    });

}