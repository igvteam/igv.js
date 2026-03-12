import { assert } from 'chai';
import "./utils/mockObjects.js"
import HicFile from '../node_modules/hic-straw/src/hicFile.js'
import NodeLocalFile from '../node_modules/hic-straw/src/io/nodeLocalFile.mjs'
import RemoteFile from "hic-straw/src/io/remoteFile.js"

suite('HicFile', function () {

    test('read header', async function () {

        const file = new RemoteFile({
            "url": "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/data/test/hic/test_chr22.hic",
        })
        const hicFile = new HicFile({file: file})

        await hicFile.readHeaderAndFooter()
        assert.equal(hicFile.magic, "HIC")
    })

    test('read matrix', async function () {

        const file = new RemoteFile({
            "url": "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/data/test/hic/test_chr22.hic",
        })
        const hicFile = new HicFile({file: file})
        const matrix = await hicFile.getMatrix(22, 22)
        assert.ok(matrix)
    })


    test('read norm vector index', async function () {

        const file = new RemoteFile({
            "url": "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/data/test/hic/test_chr22.hic",
        })
        const hicFile = new HicFile({file: file})

        const normVectorIndex = await hicFile.getNormVectorIndex()
        assert.ok(normVectorIndex)

    })

    // getNormalizationVector(type, chrIdx, unit, binSize)

    test('read norm vector', async function () {

        const file = new RemoteFile({
            "url": "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/data/test/hic/test_chr22.hic",
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
