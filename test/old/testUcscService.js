function runUcscTests() {


    // mock object

    const genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }

    QUnit.test("knownGene table", function (assert) {
        var done = assert.async();

        var chr = "chr8",
            start = 128739950,
            end = 128762045,
            featureSource = new igv.FeatureSource({
                    type: "annotation",
                    sourceType: "ucscservice",
                    source: {
                        url: "http://igv-load-balancer-25126049.us-east-1.elb.amazonaws.com/ucsc?db=hg19",
                        method: "GET",
                        tableName: 'knownGene'
                    }
                },
                genome);

        // Must get file header first

        featureSource.getFeatures(chr, start, end)
            .then(function (features) {

                assert.ok(features);
                assert.equal(4, features.length);   // feature count. Determined by grepping file

                done();
            });

    });
}



