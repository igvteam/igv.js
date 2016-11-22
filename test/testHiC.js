function runHiCTests() {

    var dataURL = "https://data.broadinstitute.org/igvdata/test/data/";

    function createMockObjects() {


    }

    asyncTest("HiC header", function () {

        var url = "../intra_nofrag_30.hic",
            bwReader;

        createMockObjects();

        bwReader = new igv.HiCReader({url: url});
        ok(bwReader);

        bwReader.readHeader().then(function () {

            equal("HIC", bwReader.magic);
            equal(9, bwReader.bpResolutions.length);
            equal(2500000, bwReader.bpResolutions[0]);
            equal(5000, bwReader.bpResolutions[8]);


            bwReader.readFooter().then(function () {

                start();
            })


        }).catch(function (error) {
            console.log(error);
            ok(false);
        });
    });



}
