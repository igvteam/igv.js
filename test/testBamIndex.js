import {loadIndex} from "../js/bam/indexFactory.js"
import {assert} from './utils/assert.js'


describe("testBamIndex", function () {

    it("load bam index", async function () {
const url = "test/data/bam/na12889.bam.bai"
        const bamIndex = await loadIndex(url, {})
        assert.ok(bamIndex)
    })

    it("load csi index", async function () {
const url = "test/data/bam/na12889.bam.csi"
        const bamIndex = await loadIndex(url, {})
        assert.ok(bamIndex)
    })
})


