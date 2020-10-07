import {loadIndex} from "../js/bam/indexFactory.js";
import {assert} from 'chai';
import {createMockObjects} from "@igvteam/test-utils/src";


suite("testBamIndex", function () {

    createMockObjects();

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


