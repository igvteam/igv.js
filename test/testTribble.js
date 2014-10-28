// Tests in this file require a server which supports range-byte requests, e.g. Apache.

function testTribble() {

    module("Tribble");


    asyncTest("Tribble index", 2, function () {

        var url = "data/tribble/gencode.v18.collapsed.bed.idx";

        // Note -- coordinates are UCSC style
        // chr22:29565177-29565216
        igv.loadTribbleIndex(url, function (index) {

            ok(index);

            start();
        });
    });

}


