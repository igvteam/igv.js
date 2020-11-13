function runImmVarTests() {

    module("dataLoader");

    var json =
        {
            "cellConditionId": 1,
            "label": "Dendritic cell, Baseline, Caucasian",
            "eqtls": [
                {
                    "id": 397615,
                    "cell_condition_id": 1,
                    "snp": "rs74992524",
                    "gene": "IL2RA",
                    "r": -0.089207612018197,
                    "beta": -0.227913842792627,
                    "t_stat": -1.493342007432,
                    "p_value": 0.136481743821021,
                    "fdr": 0.780026871340273,
                    "created_at": "2014-12-16T14:05:00.000-05:00",
                    "updated_at": "2014-12-16T14:05:00.000-05:00",
                    "bin": 627,
                    "chromosome": "chr10",
                    "position": 5618532
                },
                {
                    "id": 394780,
                    "cell_condition_id": 1,
                    "snp": "rs77747237",
                    "gene": "IL2RA",
                    "r": -0.0894894263342541,
                    "beta": -0.228695442943218,
                    "t_stat": -1.49809762459252,
                    "p_value": 0.135242480138803,
                    "fdr": 0.778060388733632,
                    "created_at": "2014-12-16T14:04:53.000-05:00",
                    "updated_at": "2014-12-16T14:04:53.000-05:00",
                    "bin": 627,
                    "chromosome": "chr10",
                    "position": 5618646
                }
            ]
        };


    asyncTest("immvar", function () {

        var url = "http://immvar.broadinstitute.org:3000/load_data",
            range = {chr: "chr10", start: 6090663, end: 6146339},
            task = null,
            source;

        var source = new igv.ImmVarReader({url: url, cellConditionId: 1, pValueField: "p_value"});

        source.readFeatures(function (features) {

            ok(features);

            start();

        }, task, range);
    })

}
