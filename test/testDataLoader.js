function runDataLoaderTests() {

    module("dataLoader");

    asyncTest("post", function () {

        var url =  "../php/postJson.php"; // "http://t2dgenetics.org/mysql/rest/server/variant-search";
        var dataLoader = new igv.DataLoader(url);

        var data = {
            "user_group": "ui",
            "filters": [
                { "filter_type": "STRING", "operand": "CHROM", "operator": "EQ", "value": "9"  },
                {"filter_type": "FLOAT", "operand": "POS", "operator": "GTE", "value": 21940000 },
                {"filter_type": "FLOAT", "operand": "POS", "operator": "LTE", "value": 22190000 }
            ],
            "columns": ["ID", "CHROM", "POS", "DBSNP_ID", "Consequence", "Protein_change"]
        };

        dataLoader.postJson(data, function (result) {

            ok(result);

            var obj = JSON.parse(result);

            start();
        });
    });

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
