function ajaxTests() {

    igv.addAjaxExtensions();


    module("dataLoader");

//    asyncTest("post", function () {
//
//        var url =  "http://localhost/igv-web/php/postJson.php"; // "http://t2dgenetics.org/mysql/rest/server/variant-search";
//        var dataLoader = new igv.DataLoader(url);
//
//        var data = {
//            "user_group": "ui",
//            "filters": [
//                { "filter_type": "STRING", "operand": "CHROM", "operator": "EQ", "value": "9"  },
//                {"filter_type": "FLOAT", "operand": "POS", "operator": "GTE", "value": 21940000 },
//                {"filter_type": "FLOAT", "operand": "POS", "operator": "LTE", "value": 22190000 }
//            ],
//            "columns": ["ID", "CHROM", "POS", "DBSNP_ID", "Consequence", "Protein_change"]
//        };
//
//        var tmp = "url=" + url + "&data=" + JSON.stringify(data);
//
//        dataLoader.postJson(tmp, function (result) {
//
//            ok(result);
//
//            var obj = JSON.parse(result);
//
//            start();
//        });
//    });

    asyncTest("readByteRange", function () {

        var url = "data/misc/BufferedReaderTest.bin",
            range1 = {start: 25, size: 100},
            range2 = {start: 50, size: 75}

        $.ajax({
            url: url,
            dataType: "binary",
            processData: false,
            headers: {Range: "bytes=" + range1.start + "-" + (range1.start + range1.size - 1) },
            success: function (arrayBuffer) {

                ok(arrayBuffer);

                var dataView = new DataView(arrayBuffer);

                for (i = 0; i < range1.size; i++) {

                    var expectedValue = -128 + range1.start + i;
                    var value = dataView.getInt8(i);
                    equal(value, expectedValue);

                }

                // Do it again for a different range.  This broke in Safari due to this bug:
                //    https://bugs.webkit.org/show_bug.cgi?id=82672
                $.ajax({
                    url: url,
                    dataType: "binary",
                    processData: false,
                    headers: {Range: "bytes=" + range2.start + "-" + (range2.start + range2.size - 1) },
                    success: function (arrayBuffer) {

                        ok(arrayBuffer);

                        var dataView = new DataView(arrayBuffer);

                        for (i = 0; i < range2.size; i++) {

                            var expectedValue = -128 + range2.start + i;
                            var value = dataView.getInt8(i);
                            equal(value, expectedValue);

                        }


                        start();
                    }
                });
            }
        });
    });
}
