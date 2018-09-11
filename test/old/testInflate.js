function runInflateTests() {

    module("ZLib");
    var numberOfAssertions = 3;
    QUnit.asyncTest("Inflate", numberOfAssertions, function (assert) {
        console.log("Inflate test");
        var url = "../test/data/misc/inflateTest.gz";

        igvxhr.loadArrayBuffer(url).then(function (data) {

            var inflate = new Zlib.Gunzip(new Uint8Array(data));
            assert.ok(inflate);
            var plain = inflate.decompress();
            assert.ok(plain);

            var str = String.fromCharCode.apply(null, plain);
            assert.ok(str.startsWith("Lorem ipsum dolor sit"));

            start();
        });

    });


}


