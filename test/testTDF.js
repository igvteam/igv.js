function runTDFTests() {

    var dataURL = "https://data.broadinstitute.org/igvdata/test/data/";

    function createMockObjects() {

    }

    function reject(error) {
        console.log(error);
        ok(false);
    }

    asyncTest("TDF header", function () {

        var url = dataURL + "tdf/gstt1_sample.bam.tdf",
            tdfReader;

        createMockObjects();

        tdfReader = new igv.TDFReader({url: url});
        ok(tdfReader);

        tdfReader.readHeader().then(function () {

            equal(4, tdfReader.version);
            equal(true, tdfReader.compressed);
            equal(10, _.size(tdfReader.datasetIndex))

            start();


        }).catch(reject);
    });


    asyncTest("TDF dataset", function () {

        var url = dataURL + "tdf/gstt1_sample.bam.tdf",
            tdfReader;

        createMockObjects();

        tdfReader = new igv.TDFReader({url: url});
        ok(tdfReader);

        tdfReader.readHeader().then(function () {

            tdfReader.readDataset("chr22", 6, "mean").then(function (dataset) {

                ok(dataset);

                equal("FLOAT", dataset.dataType);
                equal(801634, dataset.tileWidth);
                equal(64, dataset.tiles.length);
                equal(1364, dataset.tiles[30].position);
                equal(43, dataset.tiles[30].size);
                start();

            }).catch(reject);
        }).catch(reject);
    });


    asyncTest("TDF group", function () {

        var url = dataURL + "tdf/gstt1_sample.bam.tdf",
            tdfReader;

        createMockObjects();

        tdfReader = new igv.TDFReader({url: url});
        ok(tdfReader);

        tdfReader.readHeader().then(function () {

            tdfReader.readGroup("/").then(function (group) {

                ok(group);
                equal("321.74997", group["Mean"]);
                equal("hg19", group["genome"]);
                equal("7", group["maxZoom"]);

                start();

            }).catch(reject);
        }).catch(reject);
    });


    asyncTest("TDF variable step tile", function () {

        var url = dataURL + "tdf/gstt1_sample.bam.tdf",
            tdfReader;

        createMockObjects();

        tdfReader = new igv.TDFReader({url: url});
        ok(tdfReader);

        tdfReader.readHeader().then(function () {
            tdfReader.readDataset("chr22", 6, "mean").then(function (dataset) {

                ok(dataset);

                var tileNumber = 30;
                var nTracks = 1;

                tdfReader.readTile(dataset.tiles[tileNumber], nTracks).then(function (tile) {
                    equal(24049020, tile.tileStart);
                    equal(24375399, tile.start[0]);
                    equal(321.75, tile.data[0][0]);

                    start();

                }).catch(reject);
            }).catch(reject);
        }).catch(reject);
    });


    asyncTest("TDF bed tile", function () {

        var url = dataURL + "tdf/gstt1_sample.bam.tdf",
            tdfReader;

        createMockObjects();

        tdfReader = new igv.TDFReader({url: url});
        ok(tdfReader);

        tdfReader.readHeader().then(function () {

            tdfReader.readDataset("chr22", "raw").then(function (dataset) {

                ok(dataset);

                var tileNumber = 243;
                var nTracks = 1;

                tdfReader.readTile(dataset.tiles[tileNumber], nTracks).then(function (tile) {
                    ok(tile);
                    equal(24376175, tile.start[0]);
                    equal(24376200, tile.end[0]);
                    equal(5.28000020980835, tile.data[0][0]);
                    start();

                }).catch(reject);
            }).catch(reject);
        }).catch(reject);
    });


    // TODO -- NEED FIXED STEP TILE TEST

}
