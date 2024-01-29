import "./utils/mockObjects.js"
import BamReader from "../js/bam/bamReader.js"
import {assert} from 'chai'
import {createGenome} from "./utils/MockGenome.js"


suite("testCSIIndex", function () {

    test("BAM alignments - CSI index", async function () {

        const genome = createGenome("ncbi")
        const start = 122000
        const end = 123000

        const bamReader = new BamReader({
                type: 'bam',
                url: 'test/data/bam/HG02450.bam',
                indexURL: 'test/data/bam/HG02450.bam.csi'
            },
            genome)

        const bamIndex = await bamReader.getIndex()
        const chunks = bamIndex.chunksForRange(0, start, end)
        assert.equal(chunks.length, 1)
        assert.equal(chunks[0].minv.block, 4691)
        assert.equal(chunks[0].maxv.block, 40844)

        let alignmentContainer = await bamReader.readAlignments("1", start, end)
        validate(assert, alignmentContainer)

    })

    function validate(assert, alignmentContainer) {
        assert.ok(alignmentContainer)

        assert.equal(alignmentContainer.alignments.length, 59)

        const firstAlignment = alignmentContainer.alignments[0].firstAlignment

        assert.equal(firstAlignment.seq, 'CTGCACNTATTTTTTATTCTACTCTGACATTAGAATAATCCTTGAGTGGGGGAAAGGTTAAAAACCCCCCTGGATAAGTGTTACTAATCAATGATGATTG')

        assert.equal(firstAlignment.start, 121976)
        }
})