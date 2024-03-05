import "./utils/mockObjects.js"
import {assert} from 'chai'
import CytobandFileBB from "../js/genome/cytobandFileBB.js"
import {createGenome} from "./utils/MockGenome.js"
import CytobandFile from "../js/genome/cytobandFile.js"


suite("test cytobands", function () {

    test("test cytoband text", async function () {

        const genome = createGenome("ncbi")
        const url = "test/data/cyto/cytoBand.txt.gz"
        const src = new CytobandFile(url, {}, genome)

        const cytobands = await src.getCytobands("chrX")
        const last = cytobands[cytobands.length-1];
        assert.equal(22422827, last.end)

        const chromosomes = await src.getChromosomes()
        assert.equal(6, chromosomes.length)
        const lastChr = chromosomes[chromosomes.length - 1]
        assert.equal("chrX", lastChr.name)
        assert.equal(lastChr.bpLength, 22422827)

    })


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

    test("test cytoband bigbed - aliasing", async function () {

        const genome = createGenome("ncbi")
        const url = "test/data/bb/cytoBandMapped.bb"
        const src = new CytobandFileBB(url, {}, genome)

        const cytobands = await src.getCytobands("1")
        const last = cytobands[cytobands.length-1];
        assert.equal(248387328, last.end)

    })

})
