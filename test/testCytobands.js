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

    test("test cytoband bigbed remote", async function () {

        const url = "https://hgdownload.soe.ucsc.edu/hubs/GCA/009/914/755/GCA_009914755.4/bbi/GCA_009914755.4_T2T-CHM13v2.0.cytoBandMapped/cytoBandMapped.bb"
        const src = new CytobandFileBB(url)

        const cytobands = await src.getCytobands("chr1")  // "CP068269.2
        const last = cytobands[cytobands.length-1];
        assert.equal(248387328, last.end)

    })
    //CP068269.2
})
