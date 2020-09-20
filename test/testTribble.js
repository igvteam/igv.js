import loadTribbleIndex from "../js/feature/tribble.js";
import {assert} from 'chai';
import {createMockObjects} from "@igvteam/test-utils/src"

suite("testTribble", function () {

    createMockObjects();

    test("tribble", async function () {
        this.timeout(10000);
        const index = await loadTribbleIndex('https://s3.amazonaws.com/igv.org.test/data/gencode.v18.collapsed.bed.idx', {}, genome);
        assert.ok(index);
        // TODO -- add some assertions
    })
})




