import "./utils/mockObjects.js"
import BWSource from "../src/igvCore/bigwig/bwSource.js"
import BWReader from "../src/igvCore/bigwig/bwReader.js"
import FeatureSource from "../src/igvCore/feature/featureSource.js"
import {assert} from 'chai'
import {createGenome} from "./utils/MockGenome.js"

suite("testBigWig", function () {

    test("Uncompressed bigwig", async function () {

        this.timeout(10000)

        const url = "https://s3.amazonaws.com/igv.org.test/data/uncompressed.bw",
            chr = "chr21",
            start = 0,
            end = Number.MAX_SAFE_INTEGER,
            bpPerPixel = 6191354.824    // To match iOS unit test

        const bwReader = new BWReader({url: url})
        const features = await bwReader.readFeatures(chr, start, chr, end, bpPerPixel)
        assert.equal(features.length, 8)   // Verified in iPad app
    })


    /**
     * Test a BW file with an unusual layout (chromTree after full data).
     */
    test("chromTree", async function () {

        this.timeout(10000)

        const url = "https://data.broadinstitute.org/igvdata/test/data/bb/chromTreeTest.bigwig"
        const bwReader = new BWReader({url: url})
        const header = await bwReader.loadHeader()
        assert.ok(header)
    })

    test("bigwig", async function () {

        this.timeout(10000)

        const url = "test/data/bb/fixedStep.bw"
        const chr = "chr1"
        const bwReader = new BWReader({url: url})

        let start = 10006
        const end = 10040
        const bpPerPixel = 5
        const windowFunction = "none"
        const features = await bwReader.readFeatures(chr, start, chr, end, bpPerPixel, windowFunction)
        assert.equal(features.length, 35)

        //fixedStep chrom=chr1 start=10006 step=1 span=1
        // Wig fixed and variable step use 1-based coordinates
        start--
        for (let f of features) {
            assert.equal(start, f.start)
            assert.equal(f.end - f.start, 1)
            start += 1
        }
    })

    test("bigwig - aliasing", async function () {

        this.timeout(10000)

        const genome = createGenome("ncbi")
        const url = "test/data/bb/fixedStep.bw"
        const chr = "1"
        const bwReader = new BWReader({url: url}, genome)

        let start = 10006
        const end = 10040
        const bpPerPixel = 5
        const windowFunction = "none"
        const features = await bwReader.readFeatures(chr, start, chr, end, bpPerPixel, windowFunction)
        assert.equal(features.length, 35)

        //fixedStep chrom=chr1 start=10006 step=1 span=1
        // Wig fixed and variable step use 1-based coordinates
        start--
        for (let f of features) {
            assert.equal(start, f.start)
            assert.equal(f.end - f.start, 1)
            start += 1
        }
    })

    /**
     * Test a bigwig with a very large reduction level value.  This value overflows a 32-bit signed integer,
     */
    test("bigwig - big reductionLevel", async function () {

        const genome = createGenome("ncbi")
        const url = "test/data/bb/bigtools.bigWig"
        const bwReader = new BWReader({url: url}, genome)
        const zoomLevelHeaders = await bwReader.getZoomHeaders()
        assert.equal(zoomLevelHeaders[0].reductionLevel, 2684354560)
    })

    /**
     * Test a bigwig with no zoom levels.,
     */
    test("bigwig - no zooms", async function () {

        this.timeout(10000)

        const genome = createGenome("ncbi")
        const url = "test/data/bb/nozooms.bw"
        const bwReader = new BWReader({url: url}, genome)
        const zoomLevelHeaders = await bwReader.getZoomHeaders()
        assert.equal(zoomLevelHeaders.length, 0)
    })

})
