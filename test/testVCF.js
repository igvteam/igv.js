function runBEDUnitTests() {

    module("VCF");

    asyncTest("VCF parsing", function () {

        var url = "../test/data/vcf/example.vcf";

        var vcfSource = new igv.VCFSource({url: url});

        var chr = "chr1";
        var bpStart = 0;
        var bpEnd = 2400000;
        vcfSource.loadFeatures(function (featureList) {

            ok(featureList);

            var len = featureList.length;

            equal(5, len);   // # of features on chr 1 (determined by greping file)

            start();
        });

    });

}