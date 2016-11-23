function runTDFTests() {

    var dataURL = "https://data.broadinstitute.org/igvdata/test/data/";

    function createMockObjects() {

    }

    function  reject(error) {
        console.log(error);
        ok(false);
    }

    asyncTest("TDF", function () {

        var url = dataURL + "tdf/gstt1_sample.bam.tdf",
            tdfReader;

        createMockObjects();

        tdfReader = new igv.TDFReader({url: url});
        ok(tdfReader);

        tdfReader.readHeader().then(function () {
            
            equal(4, tdfReader.version);
            equal(true, tdfReader.compressed);

            tdfReader.readMasterIndex().then(function () {

                start();

            }).catch(reject);

        }).catch(reject);
    });


}
