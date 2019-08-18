import loadBamIndex from "../js/bam/bamIndex.js";
import {unbgzf} from "../js/bam/bgzf.js";
import igvxhr from "../js/igvxhr.js";

function runTabixTests() {

    var dataURL = "https://data.broadinstitute.org/igvdata/test/data/"


    QUnit.test("blocksForRange", function (assert) {
        var done = assert.async();

        var refID = 14,
            beg = 24375199,
            end = 24378544,
            indexPath = dataURL + "tabix/TSVC.vcf.gz.tbi",
            config = {};

        loadBamIndex(indexPath, config, true).then(function (bamIndex) {
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
        const data = await igvxhr.load(url,
            {
                responseType: "arraybuffer",
            })
        const result = unbgzf(data)
        assert.ok(result)
        done()
    })
}

export default runTabixTests;



