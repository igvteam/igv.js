function runDataLoaderTests() {

    module("dataLoader");

    asyncTest("readByteRange", function () {

        var url = "http://localhost/igv/test/data/BufferedReaderTest.bin";
        var dataLoader = new igv.DataLoader(url);

        dataLoader.range = {start: 25, size: 100};
        dataLoader.loadArrayBuffer(function (arrayBuffer) {

            ok(arrayBuffer);

            var dataView = new DataView(arrayBuffer);


            for (i = 0; i < dataLoader.range.size; i++) {

                var expectedValue = -128 + dataLoader.range.start + i;
                var value = dataView.getInt8(i);
                equal(expectedValue, value);

            }


            // Do it again for a different range.  This broke in Safari due to this bug:
            //    https://bugs.webkit.org/show_bug.cgi?id=82672

            dataLoader.range = {start: 50, size: 75};
            dataLoader.loadArrayBuffer(function (arrayBuffer) {

                ok(arrayBuffer);

                var dataView = new DataView(arrayBuffer);


                for (i = 0; i < dataLoader.range.size; i++) {

                    var expectedValue = -128 + dataLoader.range.start + i;
                    var value = dataView.getInt8(i);
                    equal(expectedValue, value);

                }


                // Do it again for a different range.  This broke in Safari due to this bug:
                //    https://bugs.webkit.org/show_bug.cgi?id=82672


                start();
            });


        });

    });
}
