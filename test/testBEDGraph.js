/**
 * Created by turner on 2/13/14.
 */
function runBEDGraphFeatureSourceTests() {


    asyncTest("BEDGraphFeatureSource getFeatures", 3, function () {

        var url = "../test/data/wig/bedgraph-example-uscs.bedgraph";
        var featureSource = new igv.BEDGraphFeatureSource(url);
        ok(featureSource, "featureSource should be non null");

        var chr = "chr19";
        var bpStart = 49302001;
        var bpEnd  = 49304701;

        featureSource.getFeatures(chr, bpStart, bpEnd, function(featureList) {


            ok(featureList, "featureContainer.features should be non null");

            equal(featureList.length, 9);

            console.log("featureList.length " + featureList.length);

            start();
        });

    });

}