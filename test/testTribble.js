// Tests in this file require a server which supports range-byte requests, e.g. Apache.

function testTribble() {

    module("Tribble");


    asyncTest("Tribble index", function () {

        var url = "data/bed/gencode.v18.collapsed.bed.idx";

        igv.loadTribbleIndex(url, function (index) {

            ok(index);

            start();
        });
    });


    asyncTest("Non-existent index", function () {

        var url = "data/tribble/noSuchFile.idx";

        igv.loadTribbleIndex(url, function (index) {

            equal(index, null);

            start();
        });
    });

}


