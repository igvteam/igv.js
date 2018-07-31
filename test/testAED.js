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

    asyncTest("UTF8 with BOM", function () {

        var chr = "chr2",
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

                equal(features.length, 1);

                equal(features[0].aed.metadata.affx.ucscGenomeVersion.value, "hg19");
                equal(features[0].aed.columns[14].name, "note");

                equal(features[0].name, "CNNM3");
                equal(features[0].cdStart, null); // Missing value
                equal(features[0].allColumns[14], "Test unicode:\r" +
                                                  "∞\r" +
                                                  "☃\r" +
                                                  "(infinity snowman)");
                equal(features[0].strand, "+");

                start();
            })
            .catch(function (error) {
                console.log(error);
            });
    });
}
