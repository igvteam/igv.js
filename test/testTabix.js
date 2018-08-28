function runTabixTests() {

    var dataURL = "https://data.broadinstitute.org/igvdata/test/data/"


    asyncTest("blocksForRange", function () {

        var refID = 14,
            beg = 24375199,
            end = 24378544,
            indexPath = dataURL + "tabix/TSVC.vcf.gz.tbi",
            config = {};

        igv.loadBamIndex(indexPath, config, true).then(function (bamIndex) {

            ok(bamIndex);
            start();
        }).catch(function (error) {
            ok(false);
            console.log(error);
            start();
        });

    });
    
}



