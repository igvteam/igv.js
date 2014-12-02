function eqtlUnitTests() {


    asyncTest("EQTL binary file", 2, function () {

        var url = "http://www.broadinstitute.org/igvdata/test/data/eqtl/Heart_Left_Ventricle.portal.eqtl.bin",
            featureSource = new igv.EqtlSource(url);


        var chr = "chr1";
        var bpStart = 0;
        var bpEnd = 2500000;

        featureSource.getFeatures(chr, bpStart, bpEnd, function (featureList) {

            ok(featureList);

            var len = featureList.length;

            equal(len, 5293);   // # of features on chr 1 (determined by greping file)


            start();
        });

    });

}