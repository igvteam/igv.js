import {createMockObjects} from "@igvteam/test-utils/src"
import {assert} from 'chai';
import {loadIndex} from "../js/bam/indexFactory.js"

suite("testTribble", function () {

    createMockObjects();

    const genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }

    test("tribble", async function () {
        this.timeout(10000);
        const index = await loadIndex('https://s3.amazonaws.com/igv.org.test/data/gencode.v18.collapsed.bed.idx', {}, genome);
        assert.ok(index);
        // TODO -- add some assertions
    })
})




