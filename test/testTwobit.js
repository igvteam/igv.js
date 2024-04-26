import "./utils/mockObjects.js"
import {assert} from 'chai'
import TwobitSequence from "../js/genome/twobit.js"
import BPTree from "../js/bigwig/bpTree.js"


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

    test("twobit metadata", async function () {
        const url = "test/data/twobit/GCF_000002655.1.2bit"
        const twobit = new TwobitSequence({twoBitURL: url})
        await twobit.init()
        const sequenceRecord = await twobit.getSequenceRecord("NC_007196.1")
        assert.deepEqual(sequenceRecord.dnaSize, 4079167)
    })

    test("twobit blocks", async function () {

        this.timeout(200000)

        const url = "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.2bit"
        const twobit = new TwobitSequence({twoBitURL: url})
        await twobit.init()

        const meta = await twobit.getSequenceRecord("chr1")
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

    test("twobit .bpt index", async function () {

        const url = "test/data/twobit/GCA_004363605.1.2bit.bpt"
        const bpTree = await BPTree.loadBpTree(url, {}, 0)
        assert.ok(bpTree)

        assert.equal(256, bpTree.header.blockSize);
        assert.equal(15, bpTree.header.keySize);
        assert.equal(8, bpTree.header.valSize);

        const result = await bpTree.search("RJWJ011179649.1")
        assert.ok(result)


    })

    test("twobit w bpt", async function () {

        const expectedSequence = "GCAGGTATCCAAAGCCAGAGGCCTGGTGCTACACGACTGG"

        const url = "test/data/twobit/GCF_000002655.1.2bit"
        const bptUrl = "test/data/twobit/GCF_000002655.1.2bit.bpt"
        const twobit = new TwobitSequence({twoBitURL: url, twoBitBptURL: bptUrl})
        const chr = "NC_007194.1"
        const start = 1644639
        const end = 1644679
        const seqString = await twobit.readSequence(chr, start, end)
        assert.equal(seqString, expectedSequence)



    })


})