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

    //  /chr22/z6/mean

}
