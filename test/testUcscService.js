function runUcscTests() {


    // mock object
    if (igv === undefined) {
        igv = {};
    }

    igv.browser = {
        getFormat: function () {
        },

        genome: {
            getChromosome: function (chr) {
            },
            getChromosomeName: function (chr) {
                return chr
            }
        }
    };

    asyncTest("knownGene table", function () {

        var chr = "chr8",
            bpStart = 128739950,
            bpEnd = 128762045,
            featureSource = new igv.FeatureSource({
                type: "annotation",
                sourceType: "ucscservice",
                source: {
                    url: "http://igv-load-balancer-25126049.us-east-1.elb.amazonaws.com/ucsc?db=hg19",
                    method: "GET",
                    tableName: 'knownGene'
                }
            });

        // Must get file header first

        featureSource.getFeatures(chr, bpStart, bpEnd)
            .then(function (features) {

            ok(features);
            equal(4, features.length);   // feature count. Determined by grepping file

            start();
        });

    });
}



