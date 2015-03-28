// Tests in this file require a server which supports range-byte requests, e.g. Apache.

function testTribble() {

    asyncTest("Tribble index", function () {

        var config,
            featureSource,
            index;

        config = {
            type: 'bedgraph',
            url: '//www.broadinstitute.org/igvdata/t2d/recomb_decode.bedgraph'
        };

        featureSource = new igv.FeatureSource(config);
        ok(featureSource);

        index = config.url + ".idx";

        igv.loadTribbleIndex(
            index,
            config,
            function (index) {

                ok(index);

                //var blocks = index.blocksForRange("chr1", 0, Number.MAX_VALUE);
                //
                //ok(blocks);

                start();
            });
    });


    //asyncTest("Non-existent index", function () {
    //
    //    var url = "http://www.broadinstitute.org/igvdata/public/test/data/tribble/noSuchFile.idx";
    //
    //    igv.loadTribbleIndex(url, {},  function (index) {
    //
    //        equal(index, null);
    //
    //        start();
    //    });
    //});

}


