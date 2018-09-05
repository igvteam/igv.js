function runGtexGWASUnitTests() {

    asyncTest("gtexGWAS query", function () {

        var chr = "chr1",
            //bpStart = 67655271,
            //bpEnd   = 67684468,
            //bpStart = 1,
            //bpEnd   = 1000000000000000,
            bpStart = 240045908,
            bpEnd   = 249168436,
            featureSource = new igv.FeatureSource({
                type: 'gtexGWAS',
                url: 'data/misc/GWAS_catalog_SNPs_Pval5E08_hg19_040115_subset.txt'
            });

        featureSource.getFeatures(chr, bpStart, bpEnd, function (features) {

            ok(features);
            equal(16, features.length);   // feature count. Determined by grepping file
            equal(chr, features[ 0 ].chr); // ensure features chromosome is specified chromosome

            start();
        }, undefined);

    });

    asyncTest("gtexGWAS all features", function () {

        var featureSource = new igv.FeatureSource({
                type: 'gtexGWAS',
                url: 'data/misc/GWAS_catalog_SNPs_Pval5E08_hg19_040115_subset.txt'
            });

        featureSource.allFeatures(function (features) {

            ok(features);
            equal(194, features.length);   // feature count. Determined by grepping file

            start();
        });

    });



}
