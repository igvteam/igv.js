function vcfTests() {

    module("VCF");

    asyncTest("VCF parser", function () {

        var url = "data/vcf/example.vcf";  // Example from 4.2 spec


        igvxhr.loadString(url, {}).then(function (result) {

            var parser = new igv.VcfParser(),
                featureList = parser.parseFeatures(result),
                micro;

            ok(featureList);

            var len = featureList.length;

            equal(5, len);   // # of features on chr 1 (determined by greping file)

            // The microsatellite
            micro = featureList[4];
            equal(micro.start, 1234567);
            equal(micro.end, 1234570);
            equal(2, micro.alleles.length);

            start();

        });
    });

    asyncTest("VCF feature source", function () {

        var url = "data/vcf/example.vcf",
            featureSource = new igv.FeatureSource({url: url, type: "vcf"});


        featureSource.allFeatures(function (featureList) {

            ok(featureList);

            var len = featureList.length;

            equal(5, len);   // # of features on chr 1 (

            start();
        });
    });

}
