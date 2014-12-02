// Tests in this file require a server which supports range-byte requests, e.g. Apache.

function testTribble() {

    module("Tribble");


    asyncTest("Tribble index", function () {

        var url = "http://www.broadinstitute.org/igvdata/public/test/data/bed/gencode.v18.collapsed.bed.idx";

        igv.loadTribbleIndex(url, {}, function (index) {

            ok(index);

            var blocks = index.blocksForRange("chr1", 0, Number.MAX_VALUE);

            ok(blocks);

            start();
        });
    });


    asyncTest("Non-existent index", function () {

        var url = "http://www.broadinstitute.org/igvdata/public/test/data/tribble/noSuchFile.idx";

        igv.loadTribbleIndex(url, {},  function (index) {

            equal(index, null);

            start();
        });
    });

}


