import { assert } from 'chai';
import "./utils/mockObjects.js"
import HicFile from '../src/igvCore/hic/straw/hicFile.js'
import NodeLocalFile from '../src/igvCore/hic/straw/io/nodeLocalFile.mjs'

suite('HicFile', function () {

    test('local file read header', async function () {

        const file = new NodeLocalFile({
            "path": "test/data/hic/test_chr22.hic",
        })
        const hicFile = new HicFile({file: file})

        await hicFile.readHeaderAndFooter()
        assert.equal(hicFile.magic, "HIC")
    })

    test('local file read matrix', async function () {

        const file = new NodeLocalFile({
            "path": "test/data/hic/test_chr22.hic",
        })
        const hicFile = new HicFile({file: file})
        const matrix = await hicFile.getMatrix(22, 22)
        assert.ok(matrix)
    })


    test('local file read norm vector index', async function () {

        const file = new NodeLocalFile({
            "path": "test/data/hic/test_chr22.hic"
        })
        const hicFile = new HicFile({file: file})

        const normVectorIndex = await hicFile.getNormVectorIndex()
        assert.ok(normVectorIndex)

    })

    // getNormalizationVector(type, chrIdx, unit, binSize)

    test('local file read norm vector', async function () {

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

    test('remote file read header', async function () {
        this.timeout(100000)
        const hicFile = new HicFile({
            "url": "https://www.dropbox.com/scl/fi/eqppb40khtk61262czfsn/HCT-116_Untreated.hic?rlkey=1ho9ojun138lwahi5xvs7usyx&dl=0",
            "loadFragData": false
        })

        await hicFile.readHeaderAndFooter()
        assert.equal(hicFile.magic, "HIC")

    })

    const file = new NodeLocalFile({
        "path": "test/data/hic/testBp.hic",
    })

    test('read header and footer', async function () {

        const hicFile = new HicFile({file: file})
        await hicFile.readHeaderAndFooter()
        assert.equal(hicFile.magic, "HIC")
        await hicFile.readFooter();

    })

    test('local file contact records', async function () {

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
