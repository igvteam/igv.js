import loadTribbleIndex from "../js/feature/tribble.js";
import {assert} from 'chai';
import {setup} from "./util/setup.js";

suite("testTribble", function () {

    setup('remote');

    test("tribble", async function () {
        this.timeout(10000);
        const index = await loadTribbleIndex('https://s3.amazonaws.com/igv.org.test/data/gencode.v18.collapsed.bed.idx', {}, genome);
        assert.ok(index);
        // TODO -- add some assertions
    })
})




