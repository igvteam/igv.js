import "./utils/mockObjects.js"
import BamReader from "../js/bam/bamReader.js"
import {assert} from 'chai'
import BaseModificationCounts from "../js/bam/mods/baseModificationCounts.js"
import BaseModificationKey from "../js/bam/mods/baseModificationKey.js"

suite("test base-mod counts", function () {

    test("counts", async function () {

        const bamReader = new BamReader({
            type: 'bam',
            url: 'test/data/bam/chr20_mod_call_sample.bam',
            indexURL: 'test/data/bam/chr20_mod_call_sample.bam.bai'
        })

        const chr = "20";
        const start = 13846149;
        const end = 13846294;
        let readCount = 0;

        const alignmentContainer = await bamReader.readAlignments(chr, start, end)

        const counts = new BaseModificationCounts();
        for(let alignment of alignmentContainer.alignments) {
            counts.incrementCounts(alignment);
            readCount++;
        }

        assert.ok(readCount > 0, "No data retrieved:  " + readCount);

        const expectedPositions = [13846181, 13846182, 13846227, 13846228, 13846232, 13846233, 13846234]
        const expectedCounts =    [1,        1,        1,        2,        1,        1,        1       ]

        const key =  BaseModificationKey.getKey('C', '+', "m");

        for(let i=0; i<expectedPositions.length; i++) {
            const c = counts.getCount(expectedPositions[i] - 1, key, 0);
            assert.equal(expectedCounts[i], c);
        }
    })


})
