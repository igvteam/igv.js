import "./utils/mockObjects.js"
import TDFReader from "../js/tdf/tdfReader.js"
import TDFSource from "../js/tdf/tdfSource.js"
import FeatureSource from "../js/feature/featureSource.js"
import {assert} from 'chai'
import {createGenome} from "./utils/MockGenome.js"

const genome = createGenome()

suite("testTDF", function () {

    const dataURL = "https://data.broadinstitute.org/igvdata/test/data/"

    test("TDF source get features (zoom)", async function () {
        this.timeout(10000)
        const url = "test/data/tdf/gstt1_sample.bam.tdf"

        const chr = "22",
            start = 24049020,
            end = 24375399,
            bpPerPixel = 51304566 / (Math.pow(2, 6) * 700)

        const tdfSource = FeatureSource({format: 'tdf', url: url}, genome)
        const features = await tdfSource.getFeatures({chr, start, end, bpPerPixel})
        assert.ok(features)
    })


    test("TDF header", async function () {
        this.timeout(10000)
        const url = "test/data/tdf/gstt1_sample.bam.tdf"

        const tdfReader = new TDFReader({url: url}, genome)
        await tdfReader.readHeader()
        assert.equal(4, tdfReader.version)
        assert.equal(true, tdfReader.compressed)
        assert.equal(10, Object.keys(tdfReader.datasetIndex).length)
    })


    test("TDF dataset", async function () {
        this.timeout(10000)
        const url = "test/data/tdf/gstt1_sample.bam.tdf"

        const tdfReader = new TDFReader({url: url}, genome)
        const dataset = await tdfReader.readDataset("chr22", "mean", 6)
        assert.ok(dataset)
        assert.equal("FLOAT", dataset.dataType)
        assert.equal(801634, dataset.tileWidth)
        assert.equal(64, dataset.tiles.length)
        assert.equal(1364, dataset.tiles[30].position)
        assert.equal(43, dataset.tiles[30].size)

    })


    test("TDF root group", async function () {
        this.timeout(10000)
        const url = "test/data/tdf/gstt1_sample.bam.tdf"

        const tdfReader = new TDFReader({url: url}, genome)
        const group = await tdfReader.readGroup("/")
        assert.equal("321.74997", group["Mean"])
        assert.equal("hg19", group["genome"])
        assert.equal("7", group["maxZoom"])
    })


    test("TDF variable step tile", async function () {
        this.timeout(20000)
        const url = "test/data/tdf/gstt1_sample.bam.tdf"

        const tdfReader = new TDFReader({url: url}, genome)
        const dataset = await tdfReader.readDataset("chr22", "mean", 6)
        var tileNumber = 30
        var nTracks = 1
        const tiles = await tdfReader.readTiles(dataset.tiles.slice(tileNumber, tileNumber + 1), nTracks)
        const tile = tiles[0]
        assert.equal("variableStep", tile.type)
        assert.equal(24049020, tile.tileStart)
        assert.equal(24375399, tile.start[0])
        assert.equal(321.75, tile.data[0][0])
    })


    test("TDF bed tile", async function () {
        this.timeout(20000)
        const url = "test/data/tdf/gstt1_sample.bam.tdf"

        const tdfReader = new TDFReader({url: url}, genome)
        const dataset = await tdfReader.readDataset("chr22", "raw")
        assert.ok(dataset)
        var tileNumber = 243
        var nTracks = 1
        const tiles = await tdfReader.readTiles(dataset.tiles.slice(tileNumber, tileNumber + 1), nTracks)
        const tile = tiles[0]
        assert.equal("bed", tile.type)
        assert.equal(24376175, tile.start[0])
        assert.equal(24376200, tile.end[0])
        assert.equal(5.28000020980835, tile.data[0][0])
    })


    // TODO -- NEED FIXED STEP TILE TEST


    test("TDF root group", async function () {
        this.timeout(10000)
        const url = "test/data/tdf/gstt1_sample.bam.tdf"

        const tdfReader = new TDFReader({url: url}, genome)
        const group = await tdfReader.readRootGroup()
        assert.ok(group)
        assert.ok(tdfReader.chrAliasTable)
        assert.equal(7, tdfReader.maxZoom)
    })


    test("TDF source get features (raw)", async function () {
        this.timeout(10000)
        const url = "test/data/tdf/gstt1_sample.bam.tdf"

        const chr = "22",
            start = 24376175,
            end = 24376200,
            bpPerPixel = 1
        const tdfSource = new TDFSource({url: url}, genome)
        const features = await tdfSource.getFeatures({chr, start, end, bpPerPixel})
        assert.ok(features)

    })
})
