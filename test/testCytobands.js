import "./utils/mockObjects.js"
import {assert} from 'chai'
import CytobandFileBB from "../js/genome/cytobandFileBB.js"


suite("test cytobands", function () {


    /**
     * test parsing a cytoband BB file
     * Example feature
     * {
     *   "chr": "chr1",
     *   "start": 0,
     *   "end": 1735965,
     *   "name": "p36.33",
     *   "gieStain": "gneg"
     * }
     */
    test("test cytoband bigbed", async function () {

        const url = "test/data/bb/cytoBandMapped.bb"
        const src = new CytobandFileBB(url)

        const cytobands = await src.getCytobands("chr1")
        const last = cytobands[cytobands.length-1];
        assert.equal(248387328, last.end)

    })


})
