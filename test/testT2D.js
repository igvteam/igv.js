function runDataLoaderTests() {

    module("dataLoader");

    asyncTest("post", function () {

        var proxy = "http://www.broadinstitute.org/igvdata/t2d/postJson.php";
        var url = "http://69.173.71.179:8080/prod/rest/server/trait-search";
        var dataLoader = new igv.DataLoader(proxy);

        var data = {
            "user_group": "ui",
            "filters": [
                {"operand": "CHROM", "operator": "EQ", "value": "8", "filter_type": "STRING"},
                {"operand": "POS", "operator": "GT", "value": 113075732, "filter_type": "FLOAT"},
                {"operand": "POS", "operator": "LT", "value": 123075732, "filter_type": "FLOAT"},
                {"operand": "PVALUE", "operator": "LTE", "value": 0.05, "filter_type": "FLOAT"}
            ],
            "columns": ["CHROM", "POS", "DBSNP_ID", "PVALUE", "ZSCORE"], "trait": "T2D"
        };

        var tmp = "url=" + url + "&data=" + JSON.stringify(data),

            options = {
                sendData: tmp,
                success: function (result) {

                    ok(result);

                    start();
                }
            }

        igvxhr.loadJson(proxy, options);

    });

}
