function runHiCTests() {

    var dataURL = "https://data.broadinstitute.org/igvdata/test/data/";

    function createMockObjects() {


    }

    asyncTest("HiC matrix", function () {

        var url = "../intra_nofrag_30.hic",
            hicReader;

        createMockObjects();

        hicReader = new igv.HiCReader({url: url});
        ok(hicReader);

        hicReader.readHeader().then(function () {

            equal("HIC", hicReader.magic);
            equal(9, hicReader.bpResolutions.length);
            equal(2500000, hicReader.bpResolutions[0]);
            equal(5000, hicReader.bpResolutions[8]);


            hicReader.readFooter().then(function () {
                ok(hicReader.masterIndex);
                ok(hicReader.expectedValueVectors);

                readMatrix(hicReader, 1, 1).then(function (matrix) {
                    equal(1, matrix.chr1);
                    equal(1, matrix.chr2);
                    equal(9, matrix.bpZoomData.length);

                    var zd = matrix.getZoomData({unit: "BP", binSize: 10000});
                    ok(zd);
                    equal(zd.zoom.binSize, 10000);

                    hicReader.readBlock(100, zd).then(function (block) {
                        equal(100, block.blockNumber);
                        equal(59500, block.records.length);
                        start();
                    });


                });

            })


        }).catch(function (error) {
            console.log(error);
            ok(false);
        });
    });

    function readMatrix(hicReader, chr1, chr2) {

        var key = "" + chr1 + "_" + chr2;
        return hicReader.readMatrix(key);
    }

    readBlock(blockNumber)

}
