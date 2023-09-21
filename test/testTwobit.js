import "./utils/mockObjects.js"
import {assert} from 'chai'
import TwobitSequence from "../js/genome/twobit.js"


suite("testTwobit", function () {


    test("twobit sequence", async function () {

        this.timeout(200000)

        const url = "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.2bit"
        const twobit = new TwobitSequence({fastaURL: url})

        // Non-masked no "N" region  chr1:11,830-11,869
        let expectedSeq = "GATTGCCAGCACCGGGTATCATTCACCATTTTTCTTTTCG"
        let seq = await twobit.readSequence("chr1", 11829, 11869)
        assert.equal(expectedSeq, seq)

        // "N" region  chr1:86-124
        expectedSeq = "NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN"
        seq = await twobit.readSequence("chr1", 85, 124)
        assert.equal(expectedSeq, seq)

        // masked region chr1:120,565,606-120,565,644
        expectedSeq = "ccaaatccagcccccacctgtttgtgcaaatacagtttt"
        seq = await twobit.readSequence("chr1", 120565605, 120565644)
        assert.equal(expectedSeq, seq)

        // Unrecongized sequence name
        expectedSeq = null
        seq = await twobit.readSequence("noSuchSequence")
        assert.equal(expectedSeq, seq)
    })


    test("twobit blocks", async function () {

        this.timeout(200000)

        const url = "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.2bit"
        const twobit = new TwobitSequence({fastaURL: url})
        await twobit.init()

        await twobit._readSequenceMetadata("chr1")

        const meta = twobit.metaIndex.get("chr1")
        assert.equal(248956422, meta.dnaSize)

        let lastBlockEnd = -1
        for (let block of meta.maskBlocks) {
            assert.ok(block.start + block.size > lastBlockEnd)
            lastBlockEnd = block.start
        }

        lastBlockEnd = -1
        let nBlocksSize = 0
        for (let block of meta.nBlocks) {
            assert.ok(block.start + block.size > lastBlockEnd)
            nBlocksSize += block.size
            lastBlockEnd = block.start
        }

    })

})