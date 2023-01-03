// Tests in this file require a server which supports range-byte requests, e.g. Apache.

function testTribble() {

    //mock object
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

    asyncTest("Tribble index", function () {

        var config,
            featureSource,
            index;

        config = {
            type: 'bedgraph',
            url: '//data.broadinstitute.org/igvdata/t2d/recomb_decode.bedgraph'
        };

        featureSource = new igv.FeatureSource(config);
        ok(featureSource);

        index = config.url + ".idx";

        igv.loadTribbleIndex(
            index,
            config,
            function (index) {

                ok(index);

                //var blocks = index.chunksForRange("chr1", 0, Number.MAX_VALUE);
                //
                //ok(blocks);

                start();
            });
    });


    //asyncTest("Non-existent index", function () {
    //
    //    var url = "http://data.broadinstitute.org/igvdata/public/test/data/tribble/noSuchFile.idx";
    //
    //    igv.loadTribbleIndex(url, {},  function (index) {
    //
    //        equal(index, null);
    //
    //        start();
    //    });
    //});

}


