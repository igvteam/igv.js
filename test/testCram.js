import "./utils/mockObjects.js"
import {assert} from 'chai'
import Genome from "../js/genome/genome.js"
import CramReader from "../js/cram/cramReader.js"
import LocalFile from "./utils/JBrowseFileHandler.js"

// Hack neccessary for unit testing cram bundle
Buffer.isBuffer = function isBuffer (b) {
    return ArrayBuffer.isView(b)
}

// Need an actual genome object for this test, not a mock object
const genome = await Genome.createGenome({
    id: "hg19",
    "fastaURL": "https://igv-genepattern-org.s3.amazonaws.com/genomes/seq/hg19/hg19.fasta",
    "indexURL": "https://igv-genepattern-org.s3.amazonaws.com/genomes/seq/hg19/hg19.fasta.fai",

})

suite("testCRAM", function () {

    this.timeout(20000)

    test("CRAM", async function () {

        const start = 155140000
        const end = 155160000

        const cramReader = new CramReader({
                type: 'cram',
                url: 'test/data/cram/na12889.cram',
                indexURL: 'test/data/cram/na12889.cram.crai'
            },
            genome)

        const alignmentContainer = await cramReader.readAlignments("chr1", start, end)
        validate(assert, alignmentContainer)
    })

    function validate(assert, alignmentContainer) {
        assert.ok(alignmentContainer)

        // 2 alignments, 1 paired and 1 single
        assert.equal(alignmentContainer.alignments.length, 2)

        const firstAlignment = alignmentContainer.alignments[0].firstAlignment

        assert.equal()

        assert.equal(firstAlignment.seq, 'TTCATCTAAAAATCACATTGCAAATTATTCAATATATTTGGGCCTCCATCTCGTTTACATCAATATGTGTTTGTTGAAGTATCTGCCCTGCAATGTCCATA')

        assert.deepEqual(firstAlignment.qual, [34, 9, 12, 10, 24, 17, 10, 5, 19, 7, 28, 17, 23, 29, 10,
            26, 10, 8, 14, 7, 15, 17, 32, 33, 31, 23, 34, 16, 33, 28, 34, 27, 10, 29, 10, 17, 11, 26,
            8, 27, 4, 4, 35, 32, 12, 32, 40, 39, 38, 41, 40, 36, 3, 34, 17, 30, 37, 10, 29, 36, 41,
            35, 24, 34, 11, 19, 11, 16, 24, 16, 26, 10, 11, 19, 13, 18, 11, 28, 30, 37, 30, 38, 43,
            43, 40, 43, 43, 41, 32, 34, 39, 41, 31, 37, 36, 36, 36, 33, 37, 34, 30])

        assert.equal(firstAlignment.start, 155148856)
        assert.equal(firstAlignment.scStart, 155148856 - 20)
        assert.equal(firstAlignment.lengthOnRef, 81)
        assert.equal(firstAlignment.scLengthOnRef, 101)
        assert.equal(firstAlignment.pairOrientation, 'F2R1')
        assert.equal(firstAlignment.fragmentLength, 307)
        assert.equal(firstAlignment.mq, 29)

        const blocks = firstAlignment.blocks
        assert.equal(blocks.length, 4)
        const expectedLength = [20, 46, 8, 24]
        const expectedOffset = [0, 20, 66, 77]
        const expectedTypes = ['S', 'M', 'M', 'M']
        for (let i = 0; i < 4; i++) {
            const b = blocks[i]
            assert.equal(b.len, expectedLength[i])
            assert.equal(b.type, expectedTypes[i])
            assert.equal(b.seqOffset, expectedOffset[i])
        }

        const insertions = firstAlignment.insertions
        assert.equal(insertions.length, 1)
        assert.equal(insertions[0].len, 3)
        assert.equal(insertions[0].type, 'I')

        const tags = firstAlignment.tags()
        assert.equal(tags["BQ"], "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@TPEO@@KPXPZJKS@@@@@@@@@@@@@@@@@@@@@@@@@@@")
        assert.equal(tags["AM"], 29)
        assert.equal(tags["MQ"], 29)
        assert.equal(tags["AM"], 29)
        assert.equal(tags["XT"], "M")
    }

})

