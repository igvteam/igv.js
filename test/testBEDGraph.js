/**
 * Created by turner on 2/13/14.
 */
function runBEDGraphFeatureSourceTests() {

    asyncTest("BEDGraphFeatureSource getFeatures", function () {

        var chr = "chr19",
            bpStart = 49302001,
            bpEnd   = 49304701,
            featureSource = new igv.BedFeatureSource({
                type: 'bedgraph',
                url: 'data/wig/bedgraph-example-uscs.bedgraph'
            });

        featureSource.getFeatures(chr, bpStart, bpEnd, function(features) {

            ok(features);
            equal(features.length, 9);

            start();
        }, undefined);

    });

}