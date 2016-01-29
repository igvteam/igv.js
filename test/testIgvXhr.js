function runDataLoaderTests() {

    var range = {start: 25, size: 100};

    function testRangeByte(arrayBuffer) {

        ok(arrayBuffer);

        var i;
        var dataView = new DataView(arrayBuffer);

        for (i = 0; i < range.size; i++) {

            var expectedValue = -128 + range.start + i;
            var value = dataView.getInt8(i);
            equal(expectedValue, value);

        }
        start();
    }

    asyncTest("test load", function () {

        var url = "data/misc/BufferedReaderTest.bin";

        igvxhr.load(url,
            {
                responseType: "arraybuffer",
                range: range
            }).done(testRangeByte);
    });

    asyncTest("test loadArrayBuffer", function () {

        var url = "data/misc/BufferedReaderTest.bin",
            range = {start: 25, size: 100};

        igvxhr.loadArrayBuffer(url,
            {
                range: range
            }).done(testRangeByte);
    });

    asyncTest("test loadJson", function () {

        var url = "data/json/example.json";

        igvxhr.loadJson(url, {}).done(function (result) {

            ok(result);

            ok(result.hasOwnProperty("employees"));

            start();
        });
    });

    asyncTest("test loadString", function () {

        var url = "data/json/example.json";

        igvxhr.loadString(url, {}).done(function (result) {

            ok(result);

            ok(result.startsWith("{\"employees\""));

            start();
        });
    });


    asyncTest("test loadString gzipped", function () {

        var url = "data/json/example.json.gz";

        igvxhr.loadString(url, {}).done(function (result) {

            ok(result);

            ok(result.startsWith("{\"employees\""));

            start();
        });
    });


    asyncTest("test loadString bg-zipped", function () {

        var url = "data/json/example.json.bgz";

        igvxhr.loadString(url, {bgz: true}).done(function (result) {

            ok(result);

            ok(result.startsWith("{\"employees\""));

            start();
        });
    });
}
