function runDataLoaderTests() {

    asyncTest("readByteRange new", function () {

        var url = "data/misc/BufferedReaderTest.bin",
            range = {start: 25, size: 100};

        igvxhr.load(url,
            {
                responseType: "arraybuffer",
                range: range,
                success: function (arrayBuffer) {

                    ok(arrayBuffer);

                    var dataView = new DataView(arrayBuffer);

                    for (i = 0; i < range.size; i++) {

                        var expectedValue = -128 + range.start + i;
                        var value = dataView.getInt8(i);
                        equal(expectedValue, value);

                    }

                    start();

                }

            });
    });
}
