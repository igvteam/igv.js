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


    // A read starting where a block of "N"s ends, the later blocks of "N"s must still be recognized
    test("twobit read from end of N block", async function () {

        const expectedSequence = "ACTCTATCTATCTATCTATCTATCTTTTTCCCCCCGGGGGGagagagagactctagcatcctcctacctcacNNacCNctTGGACNCcCaGGGatttcNNNcccNNCCNCgN"

        const twobit = new TwobitSequence({twoBitURL: "test/data/twobit/foo.2bit"})
        assert.equal(await twobit.readSequence("chr1", 47, 159), expectedSequence)
    })

    // The table places an "R" at chr1:11 (1-based), replacing an "N", and a "Y" at chr1:50, which is a "T" and is
    // not replaced
    test("twobit with ambiguity table", async function () {

        const twobit = new TwobitSequence({
            twoBitURL: "test/data/twobit/foo.2bit",
            twoBitAmbiguityURL: "test/data/twobit/foo.ambiguity.tsv"
        })
        assert.equal(await twobit.readSequence("chr1", 5, 15), "NNNNNRNNNN")
        assert.equal(await twobit.readSequence("chr1", 10, 11), "R")
        assert.equal(await twobit.readSequence("chr1", 5, 10), "NNNNN")   // end is exclusive
        assert.equal(await twobit.readSequence("chr1", 11, 16), "NNNNN")
        assert.equal(await twobit.readSequence("chr1", 45, 52), "NNACTCT")
    })

    // Tables bundled for hg38 and hg19 are used when the reference has no table, or its table fails to load
    test("twobit with bundled ambiguity table", async function () {

        this.timeout(20000)

        const hg38 = "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.2bit"
        let twobit = new TwobitSequence({id: "hg38", twoBitURL: hg38})
        assert.equal(await twobit.readSequence("chr3", 16902878, 16902888), "tgtgBGCGCA")

        twobit = new TwobitSequence({id: "other", twoBitURL: hg38})
        assert.equal(await twobit.readSequence("chr3", 16902878, 16902888), "tgtgNGCGCA")

        twobit = new TwobitSequence({id: "hg38", twoBitURL: hg38, twoBitAmbiguityURL: "test/data/twobit/missing.ambiguity.tsv"})
        assert.equal(await twobit.readSequence("chr3", 16902878, 16902888), "tgtgBGCGCA")
        assert.equal(twobit.loadFailures.length, 0)

        // A table that loads is used rather than the bundled one
        twobit = new TwobitSequence({id: "hg38", twoBitURL: hg38, twoBitAmbiguityURL: "test/data/twobit/foo.ambiguity.tsv"})
        assert.equal(await twobit.readSequence("chr3", 16902878, 16902888), "tgtgNGCGCA")

        twobit = new TwobitSequence({id: "hg19", twoBitURL: "https://hgdownload.soe.ucsc.edu/goldenPath/hg19/bigZips/hg19.2bit"})
        assert.equal(await twobit.readSequence("chr3", 60830758, 60830768), "CTCCRRGCTT")
    })

    test("twobit metadata", async function () {
        const url = "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/data/test/twobit/GCF_000002655.1.2bit"
        const twobit = new TwobitSequence({twoBitURL: url})
        await twobit.init()
        const sequenceRecord = await twobit.getSequenceRecord("NC_007196.1")
        assert.deepEqual(sequenceRecord.dnaSize, 4079167)
    })


    test("twobit .bpt index", async function () {

        this.timeout(20000)

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