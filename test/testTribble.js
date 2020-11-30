import "./utils/mockObjects.js"
import {assert} from 'chai';
import {loadIndex} from "../js/bam/indexFactory.js"
import {genome} from "./utils/Genome.js";

suite("testTribble", function () {

    test("tribble", async function () {
        this.timeout(10000);
        const index = await loadIndex('https://s3.amazonaws.com/igv.org.test/data/gencode.v18.collapsed.bed.idx', {}, genome);
        assert.ok(index);
        // TODO -- add some assertions
    })
})




