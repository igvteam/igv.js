function runInflateTests() {


    module("ZLib");
    var numberOfAssertions = 5;
    asyncTest("Inflate", numberOfAssertions, function () {
        console.log("Inflate test");
        var url = "../test/data/inflateTest.gz";
        var dataLoader = new igv.DataLoader(url);

        ok(dataLoader, "dataLoader should be non null");
        ok(dataLoader.url, "dataLoader.url should be non null");

        dataLoader.loadArrayBuffer(function (data) {

            var inflate = new Zlib.Gunzip(new Uint8Array(data));
            ok(inflate);
            var plain = inflate.decompress();
            ok(plain);

            var str = String.fromCharCode.apply(null, plain);
            ok(str.startsWith("Lorem ipsum dolor sit"));

            start();
        });

    });


}


