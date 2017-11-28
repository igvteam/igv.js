function runTDFTests() {

    var dataURL = "https://data.broadinstitute.org/igvdata/test/data/";

    function createMockObjects() {

        igv.browser = {
            genome: {
                getChromosome: function (name) {
                    return {bpLength: 51304566};
                },
                getChromosomeName: function (chr) {
                    return chr.startsWith("chr") ? chr : "chr" + chr;
                }
            }
        }
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
            equal(10, _.size(tdfReader.datasetIndex));

            start();


        }).catch(reject);
    });


    asyncTest("TDF dataset", function () {

        var url = dataURL + "tdf/gstt1_sample.bam.tdf",
            tdfReader;

        createMockObjects();

        tdfReader = new igv.TDFReader({url: url});
        ok(tdfReader);

        tdfReader.readDataset("chr22", "mean", 6).then(function (dataset) {

            ok(dataset);

            equal("FLOAT", dataset.dataType);
            equal(801634, dataset.tileWidth);
            equal(64, dataset.tiles.length);
            equal(1364, dataset.tiles[30].position);
            equal(43, dataset.tiles[30].size);
            start();

        }).catch(reject);
    });


    asyncTest("TDF root group", function () {

        var url = dataURL + "tdf/gstt1_sample.bam.tdf",
            tdfReader;

        createMockObjects();

        tdfReader = new igv.TDFReader({url: url});
        ok(tdfReader);

        tdfReader.readGroup("/").then(function (group) {

            ok(group);
            equal("321.74997", group["Mean"]);
            equal("hg19", group["genome"]);
            equal("7", group["maxZoom"]);

            start();

        }).catch(reject);
    });


    asyncTest("TDF variable step tile", function () {

        var url = dataURL + "tdf/gstt1_sample.bam.tdf",
            tdfReader;

        createMockObjects();

        tdfReader = new igv.TDFReader({url: url});
        ok(tdfReader);

        tdfReader.readDataset("chr22", "mean", 6).then(function (dataset) {

            ok(dataset);

            var tileNumber = 30;
            var nTracks = 1;

            tdfReader.readTiles(dataset.tiles.slice(tileNumber, tileNumber + 1), nTracks).then(function (tiles) {

                var tile = tiles[0]
                equal("variableStep", tile.type);
                equal(24049020, tile.tileStart);
                equal(24375399, tile.start[0]);
                equal(321.75, tile.data[0][0]);

                start();

            }).catch(reject);
        }).catch(reject);
    });


    asyncTest("TDF bed tile", function () {

        var url = dataURL + "tdf/gstt1_sample.bam.tdf",
            tdfReader;

        createMockObjects();

        tdfReader = new igv.TDFReader({url: url});
        ok(tdfReader);

        tdfReader.readDataset("chr22", "raw").then(function (dataset) {

            ok(dataset);

            var tileNumber = 243;
            var nTracks = 1;

            tdfReader.readTiles(dataset.tiles.slice(tileNumber, tileNumber + 1), nTracks).then(function (tiles) {
                ok(tiles);
                var tile = tiles[0];
                equal("bed", tile.type);
                equal(24376175, tile.start[0]);
                equal(24376200, tile.end[0]);
                equal(5.28000020980835, tile.data[0][0]);
                start();

            }).catch(reject);
        }).catch(reject);
    });


    // TODO -- NEED FIXED STEP TILE TEST


    asyncTest("TDF root group", function () {

        var url = dataURL + "tdf/gstt1_sample.bam.tdf",
            tdfReader;

        createMockObjects();

        tdfReader = new igv.TDFReader({url: url});
        ok(tdfReader);

        tdfReader.readRootGroup().then(function (group) {

            ok(group);
            ok(tdfReader.chrAliasTable);
            equal(7, tdfReader.maxZoom);

            start();

        }).catch(reject);
    });


    asyncTest("TDF source get features (raw)", function () {

        var url = dataURL + "tdf/gstt1_sample.bam.tdf",
            tdfSource,
            chr = "chr22",
            bpstart = 24376175,
            end = 24376200,
            bpPerPixel = 1;

        createMockObjects();

        tdfSource = new igv.TDFSource({url: url});

        tdfSource.getFeatures(chr, bpstart, end, bpPerPixel).then(function (features) {

            ok(features);

            start();

        }).catch(reject);
    });


    asyncTest("TDF source get features (zoom)", function () {

        var url = dataURL + "tdf/gstt1_sample.bam.tdf",
            tdfSource,
            chr = "chr22",
            bpstart = 24049020,
            end = 24375399,
            bpPerPixel = 51304566 / (Math.pow(2, 6) *700);

        createMockObjects();

        tdfSource = new igv.TDFSource({url: url});

        tdfSource.getFeatures(chr, bpstart, end, bpPerPixel).then(function (features) {

            ok(features);

            start();

        }).catch(reject);
    });

}
