function runBufferedReaderTests() {

    module("BUfferedReader");

    asyncTest("read", function () {

        var url = "../test/data/BufferedReaderTest.bin";
        var range = {start: 25, size: 100};
        var bufferedReader = new igv.BufferedReader(url, 256, 16);

        bufferedReader.dataViewForRange(range, function (dataView) {

            var i;

            ok(dataView);

            for (i = 0; i < range.size; i++) {

                var expectedValue = -128 + range.start + i;
                var value = dataView.getInt8(i);
                equal(expectedValue, value);


            }

            start();
        });

    });
}