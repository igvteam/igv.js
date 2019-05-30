function runTabixTests() {

    var dataURL = "https://data.broadinstitute.org/igvdata/test/data/"


    QUnit.test("blocksForRange", function (assert) {
        var done = assert.async();

        var refID = 14,
            beg = 24375199,
            end = 24378544,
            indexPath = dataURL + "tabix/TSVC.vcf.gz.tbi",
            config = {};

        igv.loadBamIndex(indexPath, config, true).then(function (bamIndex) {

            assert.ok(bamIndex);
            done();
        }).catch(function (error) {
            assert.ok(false);
            console.log(error);
            done();
        });
    });

    QUnit.test("bgzip", async function (assert) {

        var done = assert.async();

        const url = "data/bed/missing_linefeed.bed.gz"
        const data = await igv.xhr.load(url,
            {
                responseType: "arraybuffer",
            })

        const result = igv.unbgzf(data)
        assert.ok(result)

        done()

    })

}



