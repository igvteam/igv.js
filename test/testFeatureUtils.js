import "./utils/mockObjects.js"
import {assert} from 'chai'
import FastaSequence from "../src/igvCore/genome/indexedFasta.js"
import NonIndexedFasta from "../src/igvCore/genome/nonIndexedFasta.js"
import {findFeatureAfterCenter} from "../src/igvCore/feature/featureUtils.js"

suite("testFeatureUtils", function () {


    test("find insert index", async function () {


        const featureList = [    // Center
            {start: 1, end: 2},   // 1.5
            {start: 2, end: 2},   // 2
            {start: 2, end: 2},   // 2
            {start: 2, end: 2},   // 2
            {start: 3, end: 5},   // 4
            {start: 4, end: 6}]   // 5

// Forward direction
        let idx = findFeatureAfterCenter(featureList, 1.5, true)
        assert.equal(idx.start, 2)
        assert.equal(idx.end, 2)

        idx = findFeatureAfterCenter(featureList, 0.5, true)
        assert.equal(idx.start, 1)
        assert.equal(idx.end, 2)

        idx = findFeatureAfterCenter(featureList, 2.5, true)
        assert.equal(idx.start, 3)
        assert.equal(idx.end, 5)

        idx = findFeatureAfterCenter(featureList, 2, true)
        assert.equal(idx.start, 3)
        assert.equal(idx.end, 5)

        idx = findFeatureAfterCenter(featureList, 5, true)
        assert.isUndefined(idx)

        // Reverse (find first feature with center < position
        idx = findFeatureAfterCenter(featureList, 1.6, false)
        assert.equal(idx.start, 1)
        assert.equal(idx.end, 2)

        idx = findFeatureAfterCenter(featureList, 0.5, false)
        assert.isUndefined(idx)

        idx = findFeatureAfterCenter(featureList, 2.5, false)
        assert.equal(idx.start, 2)
        assert.equal(idx.end, 2)

        idx = findFeatureAfterCenter(featureList, 2, false)
        assert.equal(idx.start, 1)
        assert.equal(idx.end, 2)

        idx = findFeatureAfterCenter(featureList, 5, false)
        assert.equal(idx.start, 3)
        assert.equal(idx.end, 5)

    })

})
