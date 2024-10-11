import "./utils/mockObjects.js"
import BamReader from "../js/bam/bamReader.js"
import {assert} from 'chai'
import BamReaderNonIndexed from "../js/bam/bamReaderNonIndexed.js"
import {createGenome} from "./utils/MockGenome.js"


suite("testBAM", function () {

    test("BAM alignments - CSI index", async function () {

        const genome = createGenome("ucsc")
        const start = 155140000
        const end = 155160000

        const bamReader = new BamReader({
                type: 'bam',
                url: 'test/data/bam/na12889.bam',
                indexURL: 'test/data/bam/na12889.bam.csi'
            },
            genome)

        let alignmentContainer = await bamReader.readAlignments("chr1", start, end)
        validate(assert, alignmentContainer)

        alignmentContainer = await bamReader.readAlignments("1", start, end)
        validate(assert, alignmentContainer)

    })

    test("BAM alignments - CSI index", async function () {

        const genome = createGenome("ncbi")
        const start = 155140000
        const end = 155160000

        const bamReader = new BamReader({
                type: 'bam',
                url: 'test/data/bam/na12889.bam',
                indexURL: 'test/data/bam/na12889.bam.csi',
                // filter: {              // Allow duplicates, secondary, and supplementary
                //     duplicate: true,
                //     secondary: true,
                //     supplementary: true
                // }
            },
            genome)

        let alignmentContainer = await bamReader.readAlignments("chr1", start, end)
        validate(assert, alignmentContainer)

        alignmentContainer = await bamReader.readAlignments("1", start, end)
        validate(assert, alignmentContainer)

    })

    test("BAM alignments - non indexed", async function () {

        const start = 155140000
        const end = 155160000

        const bamReader = new BamReaderNonIndexed({
            type: 'bam',
            url: 'test/data/bam/na12889.bam',
            indexed: false
        })

        let alignmentContainer = await bamReader.readAlignments("chr1", start, end)
        validate(assert, alignmentContainer)
    })


    function validate(assert, alignmentContainer) {
        assert.ok(alignmentContainer)

        // 2 alignments, 1 paired and 1 single
        assert.equal(alignmentContainer.alignments.length, 2)

        const firstAlignment = alignmentContainer.alignments[0].firstAlignment

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

    /**
     * A [!-~] Printable character
     * i [-+]?[0-9]+ Signed integer16
     * f [-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)? Single-precision floating number
     * Z [ !-~]* Printable string, including space
     * H ([0-9A-F][0-9A-F])* Byte array in the Hex format17
     * B [cCsSiIf](,[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)* Integer or numeric array
     *
     *  X0:i:10	X1:i:5	MD:Z:100	RG:Z:SRR360773	AM:i:0	NM:i:0	SM:i:0	MQ:i:0	XT:A:R	BQ:Z:@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@C	pa:f:228.71
     */
    test("tags", async function () {

        const bamReader = new BamReaderNonIndexed({
            type: 'bam',
            url: 'test/data/bam/tags.bam',
            indexed: false
        })

        const alignmentContainer = await bamReader.readAlignments("1", 119930, 119940)
        const alignment = alignmentContainer.alignments[0].firstAlignment;

        const tags = alignment.tags();
        assert.ok(floatEqual(tags["pa"], 228.71))
        assert.equal(tags["X0"], 10)
        assert.equal(tags["RG"], "SRR360773")
        assert.equal(tags["XT"], "R")

    })
 })

function floatEqual(f1, f2) {
    const dif = Math.abs(f1 - f2) / (f1 + f2)
    return dif < 0.00001
}

