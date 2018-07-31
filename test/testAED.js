function runAedTests() {


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

    asyncTest("AED - UTF8 with BOM", function () {

        var chr = "chr1",
            bpStart = 0,
            bpEnd = Number.MAX_VALUE,
            featureSource = new igv.FeatureSource({
                format: 'aed',
                indexed: false,
                url: 'data/aed/utf8-bom.aed'
            });

        // Must get file header first
        featureSource.getFeatures(chr, bpStart, bpEnd)
            .then(function (features) {

                // We read two features, filtering does not seem to work
                equal(features.length, 2);

                equal(features[0].name, "TP73");
                equal(features[1].name, "CNNM3");
                equal(features[0].strand, "+");
                equal(features[0].cdStart, 3569128);
                equal(features[1].cdStart, null); // Missing value
                equal(features[0].aed.metadata.affx.ucscGenomeVersion.value, "hg19");
                equal(features[0].aed.columns[14].name, "note");
                equal(features[1].allColumns[14], "Test unicode:\r" +
                "∞\r" +
                "☃\r" +
                "(infinity snowman)");

                start();
            })
            .catch(function (error) {
                console.log(error);
            });
    });
}
