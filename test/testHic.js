import {assert} from './utils/assert.js'
import HicFile from 'hic-straw/src/hicFile.js'
import NodeLocalFile from 'hic-straw/src/io/nodeLocalFile.mjs'

describe('HicFile', function () {

    it('local file read header', async function () {

        const file = new NodeLocalFile({
            "path": "test/data/hic/test_chr22.hic",
        })
        const hicFile = new HicFile({file: file})

        await hicFile.readHeaderAndFooter()
        assert.equal(hicFile.magic, "HIC")
    })

    it('local file read matrix', async function () {

        const file = new NodeLocalFile({
            "path": "test/data/hic/test_chr22.hic",
        })
        const hicFile = new HicFile({file: file})
        const matrix = await hicFile.getMatrix(22, 22)
        assert.ok(matrix)
    })


    it('local file read norm vector index', async function () {

        const file = new NodeLocalFile({
            "path": "test/data/hic/test_chr22.hic"
        })
        const hicFile = new HicFile({file: file})

        const normVectorIndex = await hicFile.getNormVectorIndex()
        assert.ok(normVectorIndex)

    })

    // getNormalizationVector(type, chrIdx, unit, binSize)

    it('local file read norm vector', async function () {

        const file = new NodeLocalFile({
            "path": "test/data/hic/test_chr22.hic",
        })
        const hicFile = new HicFile({file: file})

        const type = "KR"
        const chr = "22"
        const unit = "BP"
        const binSize = 100000
        const normVector = await hicFile.getNormalizationVector(type, chr, unit, binSize)
        assert.equal(normVector.nValues, 515)
    })

    const file = new NodeLocalFile({
        "path": "test/data/hic/testBp.hic",
    })

    it('read header and footer', async function () {

        const hicFile = new HicFile({file: file})
        await hicFile.readHeaderAndFooter()
        assert.equal(hicFile.magic, "HIC")
        await hicFile.readFooter();

    })

    it('local file contact records', async function () {

        const hicFile = new HicFile({file: file})
        const contactRecords = await hicFile.getContactRecords(
            undefined,
            {chr: "0", start: 0, end: 100000000},
            {chr: "0", start: 0, end: 100000000},
            "BP",
            10000
        )

        assert.ok(contactRecords)
        assert.equal(contactRecords.length, 2500)
    })


})
