function runVariantLoaderTests() {
    asyncTest("Variant Load Files", function () {

        console.log(igv);

        var variantLoader = new igv.VariantLoader();

        // console.log('VariantTest is running');
        var url = 'http://snorlax.ucsd.edu:8659/data/static/data/hipstr_calls';
        variantLoader.loadAllFiles(url, {method: 'GET'}).then(function(data) {
            ok(data);
            equal(3, data.length);

            start();
        });
    });
}