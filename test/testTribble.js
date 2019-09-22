// Tests in this file require a server which supports range-byte requests, e.g. Apache.

import loadTribbleIndex from "../js/feature/tribble.js";

function runTribbleTests() {


//mock object
    const genome = {
        getChromosome: function (chr) {
        },
        getChromosomeName: function (chr) {
            return chr
        }
    }


    QUnit.test("tribble", async function (assert) {

        const done = assert.async();

        const index = await loadTribbleIndex('https://s3.amazonaws.com/igv.org.test/data/gencode.v18.collapsed.bed.idx', {}, genome);
        assert.ok(index);

        //var blocks = index.blocksForRange("chr1", 0, Number.MAX_VALUE);
        //
        //ok(blocks);

        done();
    });
}

export default runTribbleTests



