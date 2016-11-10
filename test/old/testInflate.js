function runInflateTests() {


    module("ZLib");
    var numberOfAssertions = 3;
    asyncTest("Inflate", numberOfAssertions, function () {
        console.log("Inflate test");
        var url = "../test/data/misc/inflateTest.gz";

        igvxhr.loadArrayBuffer(url).then(function (data) {

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


