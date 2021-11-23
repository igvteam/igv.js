import "./utils/mockObjects.js"
import {assert} from 'chai';
import BamUtils from "../js/bam/bamUtils.js"

suite("testBAMUtils", function () {

    test("BAM alignments - CSI index", async function () {

        const cigar = '8385S18M4I1M1I9M1I14M2I4M1D1M1D12M1D5M1I9M1D5M1D2M1D7M1I1M2I35M2I27M5794S';
        const expected = 156;
        const len = BamUtils.computeLengthOnReference(cigar);
        assert.equal(len, expected);
    });



})

