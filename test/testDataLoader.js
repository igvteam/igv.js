function runDataLoaderTests() {

    module("dataLoader");

    asyncTest("post", function () {

        var proxy =  "http://www.broadinstitute.org/igvdata/t2d/postJson.php";
        var url = "http://69.173.71.179:8080/prod/rest/server/trait-search";
        var dataLoader = new igv.DataLoader(proxy);

        var data = {
            "user_group":"ui",
            "filters":[
                {"operand":"CHROM","operator":"EQ","value":"8","filter_type":"STRING"},
                {"operand":"POS","operator":"GT","value":113075732,"filter_type":"FLOAT"},
                {"operand":"POS","operator":"LT","value":123075732,"filter_type":"FLOAT"},
                {"operand":"PVALUE","operator":"LTE","value":0.05,"filter_type":"FLOAT"}],
            "columns":["CHROM","POS","DBSNP_ID","PVALUE","ZSCORE"],"trait":"T2D"
        };

        var tmp = "url=" + url + "&data=" + JSON.stringify(data);

        dataLoader.postJson(tmp, function (result) {

            ok(result);

            var obj = JSON.parse(result);

            start();
        });
    });

    asyncTest("readByteRange", function () {

      //  var href = document.href;

        var url = "data/BufferedReaderTest.bin";
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
