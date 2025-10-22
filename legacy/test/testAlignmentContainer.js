import "./utils/mockObjects.js"
import {assert} from 'chai'
import BamReaderNonIndexed from "../js/bam/bamReaderNonIndexed.js"

suite("testAlignmentUtils", function () {


    test("Alignment packing", async function () {
        this.timeout(10000)

        const chr = "chr22"
        const start = 24375132
        const end = 24385311

        const bamReader = new BamReaderNonIndexed({
            type: 'bam',
            url: 'test/data/bam/gstt1_sample.bam',
            indexed: false
        })

        const alignmentContainer = await bamReader.readAlignments(chr, start, end)

        const viewAsPairs = false
        const showSoftClips = false
        const groupBy = undefined
        alignmentContainer.pack({viewAsPairs, showSoftClips, groupBy})

        const groups = alignmentContainer.packedGroups
        const rows = groups.get("").rows

        let count = 0
        for (let r of rows) {
            count += r.alignments.length
        }

        // All alignments are packed
        assert.equal(alignmentContainer.allAlignments().length, count)

        // No duplicates
        const seen = new Set()
        for (let r of rows) {
            for (let a of r.alignments) {
                if (seen.has(a)) {
                    assert.fail(a, undefined, 'Alignment seen twice')
                }
                seen.add(a)
            }
        }

        // No alignment overlaps
        for (let r of rows) {
            let lastEnd = -1
            for (let a of r.alignments) {
                assert.isAtLeast(a.start, lastEnd, 'Alignment start is < last end')
                lastEnd = a.end
            }
        }
    })
})

