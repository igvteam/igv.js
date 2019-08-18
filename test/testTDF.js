import TDFReader from "../js/tdf/tdfReader.js";

function runTDFTests() {

    const dataURL = "https://data.broadinstitute.org/igvdata/test/data/";

    // Mock objects

    // The TDF file uses chr1, chr2, ... convention.  Define genome as 1,2,3... to test chromosome aliasing
    const genome = {
        getChromosome: function (name) {
            return {bpLength: 51304566};
        },
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr.substr(3) : + chr;
        }
    }


    function reject(error) {
        console.log(error);
        assert.ok(false);
    }

    QUnit.test("TDF header", function(assert) {
        var done = assert.async();

        var url = dataURL + "tdf/gstt1_sample.bam.tdf",
            tdfReader;

        tdfReader = new TDFReader({url: url}, genome);
        assert.ok(tdfReader);

        tdfReader.readHeader().then(function () {

            assert.equal(4, tdfReader.version);
            assert.equal(true, tdfReader.compressed);
            assert.equal(10, Object.keys(tdfReader.datasetIndex).length);

            done();


        }).catch(function (error) {console.log(error); assert.ok(false); });
    });


    QUnit.test("TDF dataset", function(assert) {
        var done = assert.async();

        var url = dataURL + "tdf/gstt1_sample.bam.tdf",
            tdfReader;

        tdfReader = new TDFReader({url: url}, genome);
        assert.ok(tdfReader);

        tdfReader.readDataset("chr22", "mean", 6).then(function (dataset) {

            assert.ok(dataset);

            assert.equal("FLOAT", dataset.dataType);
            assert.equal(801634, dataset.tileWidth);
            assert.equal(64, dataset.tiles.length);
            assert.equal(1364, dataset.tiles[30].position);
            assert.equal(43, dataset.tiles[30].size);
            done();

        }).catch(function (error) {console.log(error); assert.ok(false); });
    });


    QUnit.test("TDF root group", function(assert) {
        var done = assert.async();

        var url = dataURL + "tdf/gstt1_sample.bam.tdf",
            tdfReader;

        tdfReader = new TDFReader({url: url}, genome);
        assert.ok(tdfReader);

        tdfReader.readGroup("/").then(function (group) {

            assert.ok(group);
            assert.equal("321.74997", group["Mean"]);
            assert.equal("hg19", group["genome"]);
            assert.equal("7", group["maxZoom"]);

            done();

        }).catch(function (error) {console.log(error); assert.ok(false); });
    });


    QUnit.test("TDF variable step tile", function(assert) {
        var done = assert.async();

        var url = dataURL + "tdf/gstt1_sample.bam.tdf",
            tdfReader;

        tdfReader = new TDFReader({url: url}, genome);
        assert.ok(tdfReader);

        tdfReader.readDataset("chr22", "mean", 6).then(function (dataset) {

            assert.ok(dataset);

            var tileNumber = 30;
            var nTracks = 1;

            tdfReader.readTiles(dataset.tiles.slice(tileNumber, tileNumber + 1), nTracks).then(function (tiles) {

                var tile = tiles[0]
                assert.equal("variableStep", tile.type);
                assert.equal(24049020, tile.tileStart);
                assert.equal(24375399, tile.start[0]);
                assert.equal(321.75, tile.data[0][0]);

                done();

            }).catch(function (error) {console.log(error); assert.ok(false); });
        }).catch(function (error) {console.log(error); assert.ok(false); });
    });


    QUnit.test("TDF bed tile", function(assert) {
        var done = assert.async();

        var url = dataURL + "tdf/gstt1_sample.bam.tdf",
            tdfReader;


        tdfReader = new TDFReader({url: url}, genome);
        assert.ok(tdfReader);

        tdfReader.readDataset("chr22", "raw").then(function (dataset) {

            assert.ok(dataset);

            var tileNumber = 243;
            var nTracks = 1;

            tdfReader.readTiles(dataset.tiles.slice(tileNumber, tileNumber + 1), nTracks).then(function (tiles) {
                assert.ok(tiles);
                var tile = tiles[0];
                assert.equal("bed", tile.type);
                assert.equal(24376175, tile.start[0]);
                assert.equal(24376200, tile.end[0]);
                assert.equal(5.28000020980835, tile.data[0][0]);
                done();

            }).catch(function (error) {console.log(error); assert.ok(false); });
        }).catch(function (error) {console.log(error); assert.ok(false); });
    });


    // TODO -- NEED FIXED STEP TILE TEST

    // eweitz 2018-09-06: Disable for now, due to consistent failure
    //
    // QUnit.test("TDF root group", function(assert) {
    //     var done = assert.async();

    //     var url = dataURL + "tdf/gstt1_sample.bam.tdf",
    //         tdfReader;


    //     tdfReader = new TDFReader({url: url}, genome);
    //     assert.ok(tdfReader);

    //     tdfReader.readRootGroup().then(function (group) {

    //         assert.ok(group);
    //         assert.ok(tdfReader.chrAliasTable);
    //         assert.equal(7, tdfReader.maxZoom);

    //         done();

    //     }).catch(function (error) {console.log(error); assert.ok(false); });
    // });

    // eweitz 2018-09-06: Disable for now, due to consistent failure
    //
    // QUnit.test("TDF source get features (raw)", function(assert) {
    //     var done = assert.async();

    //     var url = dataURL + "tdf/gstt1_sample.bam.tdf",
    //         tdfSource,
    //         chr = "22",
    //         bpstart = 24376175,
    //         end = 24376200,
    //         bpPerPixel = 1;


    //     tdfSource = new TDFSource({url: url}, genome);

    //     tdfSource.getFeatures(chr, bpstart, end, bpPerPixel).then(function (features) {

    //         assert.ok(features);

    //         done();

    //     }).catch(function (error) {console.log(error); assert.ok(false); });
    // });

    // eweitz 2018-09-06: Disable for now, due to consistent failure
    //
    // QUnit.test("TDF source get features (zoom)", function(assert) {
    //     var done = assert.async();

    //     var url = dataURL + "tdf/gstt1_sample.bam.tdf",
    //         tdfSource,
    //         chr = "22",
    //         bpstart = 24049020,
    //         end = 24375399,
    //         bpPerPixel = 51304566 / (Math.pow(2, 6) *700);


    //     tdfSource = new TDFSource({url: url}, genome);

    //     tdfSource.getFeatures(chr, bpstart, end, bpPerPixel).then(function (features) {

    //         assert.ok(features);

    //         done();

    //     }).catch(function (error) {console.log(error); assert.ok(false); });
    // });

}

export default runTDFTests;
