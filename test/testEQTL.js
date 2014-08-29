function eqtlUnitTests() {


    asyncTest("EQTL binary file", 2, function () {

        var url = "../test/data/Heart_Left_Ventricle.portal.sorted.eqtl.bin";

        var eqtlDataSource = new igv.EQTLFeatureSource(url);

        var chr = "chr1";
        var bpStart = 0;
        var bpEnd = 2400000;
        eqtlDataSource.getFeatures(chr, bpStart, bpEnd, function (featureList) {

            ok(featureList);

            var len = featureList.length;

            equal(10861, len);   // # of features on chr 1 (determined by greping file)


            start();
        });

    });

}