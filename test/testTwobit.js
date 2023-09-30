import "./utils/mockObjects.js"
import {assert} from 'chai'
import TwobitSequence from "../js/genome/twobit.js"


suite("testTwobit", function () {

    test("twobit", async function () {

        const expectedSequence = "NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNACTCTATCTATCTATCTATCTATCTTTTT" +
            "CCCCCCGGGGGGagagagagactc tagcatcctcctacctcacNNacCNctTGGACNCcCaGGGatttcNNNcccNNCCNCgN"

        const url = "test/data/twobit/foo.2bit"
        const twobit = new TwobitSequence({fastaURL: url})
        const start = 5
        const end = 100
        const seqString = await twobit.readSequence("chr1", start, end)
       // assert.equal(seqString.length, end - start)
        assert.equal(seqString, expectedSequence.substring(start, end))
    })

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

        // partially masked region chr1:120,565,295-120,565,335
        expectedSeq = "TATGAACTTTTGTTCGTTGGTgctcagtcctagaccctttt"
        seq = await twobit.readSequence("chr1", 120565294, 120565335)
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

        await twobit._getSequenceMetaData("chr1")

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