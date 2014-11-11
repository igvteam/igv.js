function vcfTests() {

    module("VCF");

    asyncTest("VCF parser", function () {

        var url = "data/vcf/example.vcf";


        igvxhr.loadString(url, {

            success: function (result) {

                var parser = igv.vcfParser(),
                    featureList = parser.parseFeatures(result);

                ok(featureList);

                var len = featureList.length;

                equal(5, len);   // # of features on chr 1 (determined by greping file)

                start();
            }
        });

    });

    asyncTest("VCF feature source", function () {

        var url = "data/vcf/example.vcf",
            featureSource = new igv.BedFeatureSource({url: url, type: "vcf"});


        featureSource.allFeatures(function (featureList) {

            ok(featureList);

            var len = featureList.length;

            equal(5, len);   // # of features on chr 1 (determined by greping file)

            start();
        });
    });

}