function tabixTests() {


    asyncTest("blocksForRange", function () {

        var refID = 14,
            beg = 24375199,
            end = 24378544,
            indexPath = "data/tabix/TSVC.vcf.gz.tbi",
            config = {};

        igv.loadBamIndex(indexPath, config, function (bamIndex) {

ok(bamIndex);
            start();
        },
        true);

    });


}



