import "./utils/mockObjects.js"
import {assert} from 'chai'
import TwobitSequence from "../js/genome/twobit.js"
import BPTree from "../js/bigwig/bpTree.js"


suite("testTwobit", function () {

    test("twobit", async function () {

        const expectedSequence = "NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNACTCTATCTATCTATCTATCTATCTTTTT" +
            "CCCCCCGGGGGGagagagagactc tagcatcctcctacctcacNNacCNctTGGACNCcCaGGGatttcNNNcccNNCCNCgN"

        const url = "test/data/twobit/foo.2bit"
        const twobit = new TwobitSequence({twoBitURL: url})
        const start = 5
        const end = 100
        const seqString = await twobit.readSequence("chr1", start, end)
        // assert.equal(seqString.length, end - start)
        assert.equal(seqString, expectedSequence.substring(start, end))
    })


    test("twobit metadata", async function () {
        const url = "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/data/test/twobit/GCF_000002655.1.2bit"
        const twobit = new TwobitSequence({twoBitURL: url})
        await twobit.init()
        const sequenceRecord = await twobit.getSequenceRecord("NC_007196.1")
        assert.deepEqual(sequenceRecord.dnaSize, 4079167)
    })


    test("twobit .bpt index", async function () {

        const url = "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/data/test/twobit/GCA_004363605.1.2bit.bpt"
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

        const url = "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/data/test/twobit/GCF_000002655.1.2bit"
        const bptUrl = "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/data/test/twobit/GCF_000002655.1.2bit.bpt"
        const twobit = new TwobitSequence({twoBitURL: url, twoBitBptURL: bptUrl})
        const chr = "NC_007194.1"
        const start = 1644639
        const end = 1644679
        const seqString = await twobit.readSequence(chr, start, end)
        assert.equal(seqString, expectedSequence)



    })


})