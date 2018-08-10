/**
 * Created by turner on 2/13/14.
 */
function runBEDGraphTests() {


    //mock object
    const genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }

    asyncTest("BEDGraphFeatureSource getFeatures", function () {

        var chr = "chr19",
            bpStart = 49302001,
            bpEnd = 49304701,
            featureSource = new igv.FeatureSource({
                    format: 'bedgraph',
                    url: 'data/wig/bedgraph-example-uscs.bedgraph'
                },
                genome);

        featureSource.getFeatures(chr, bpStart, bpEnd).then(function (features) {

            ok(features);
            equal(features.length, 9);

            //chr19	49302600	49302900	-0.50
            var f = features[2];
            equal(f.chr, "chr19", "chromosome");
            equal(f.start, 49302600, "start");
            equal(f.end, 49302900, "end");
            equal(f.value, -0.50, "value");

            start();
        }).catch(function (error) {
            console.log(error);
            ok(false);
        });

    });

}
