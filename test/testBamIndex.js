import "./utils/mockObjects.js"
import {loadIndex} from "../js/bam/indexFactory.js";
import {assert} from 'chai';


suite("testBamIndex", function () {

test("load bam index", async function () {
        this.timeout(100000);
        const url = require.resolve("./data/bam/na12889.bam.bai");
        const bamIndex = await loadIndex(url, {}, false)
        assert.ok(bamIndex);
    })

    test("load csi index", async function () {
        this.timeout(100000);
        const url = require.resolve("./data/bam/na12889.bam.csi");
        const bamIndex = await loadIndex(url, {}, false)
        assert.ok(bamIndex);
    })
});


