import "./utils/mockObjects.js"
import BWSource from "../js/bigwig/bwSource.js"
import BWReader from "../js/bigwig/bwReader.js"
import FeatureSource from "../js/feature/featureSource.js"
import {assert} from 'chai'
import {createGenome} from "./utils/MockGenome.js"

suite("testBigWig", function () {

    /**
     * Test a BW file with an unusual layout (chromTree after full data).
     */
    test("chromTree", async function () {

        this.timeout(30000)

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
     * Test a big-endian bigwig.  It holds 20 intervals chr1:i*100-(i*100+50) with value i+1, and one zoom level of
     * 800 bp.
     */
    test("bigwig - big endian", async function () {

        this.timeout(10000)

        const url = "test/data/bb/bigEndian.bw"
        const chr = "chr1"
        const bwReader = new BWReader({url: url})
        assert.equal(await bwReader.getType(), "bigwig")

        const features = await bwReader.readFeatures(chr, 0, chr, 2000, undefined, "none")
        assert.equal(features.length, 20)
        for (let i = 0; i < 20; i++) {
            assert.equal(features[i].start, i * 100)
            assert.equal(features[i].end, i * 100 + 50)
            assert.equal(features[i].value, i + 1)
        }

        const zoomFeatures = await bwReader.readFeatures(chr, 0, chr, 2000, 1000, "mean")
        assert.deepEqual(zoomFeatures.map(f => [f.start, f.end, f.value]), [[0, 750, 4.5], [800, 1550, 12.5], [1600, 1950, 18.5]])
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