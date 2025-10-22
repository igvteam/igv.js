import "./utils/mockObjects.js"
import FeatureSource from "../js/feature/featureSource.js"
import Genome from "../js/genome/genome.js"
import {assert} from 'chai'
import {createGenome} from "./utils/MockGenome.js"

suite("testSeg", function () {

    const dataURL = "https://data.broadinstitute.org/igvdata/test/data/"


    test("SEG indexed query", async function () {

        this.timeout(100000)

        const genome = createGenome("ucsc")

        await genome.loadChromosome("chr1")

        const url = "https://s3.amazonaws.com/igv.org.demo/GBM-TP.seg.gz"
        const featureSource = FeatureSource(
            {format: 'seg', url: url, indexURL: url + ".tbi"},
            genome)
        const chr = "chr1"
        const start = 0
        const end = Number.MAX_SAFE_INTEGER

        const features = await featureSource.getFeatures({chr, start, end})
        assert.ok(features)
        assert.equal(features.length, 8243)
        // Test 1 feature, insure its on chr1
        const c = genome.getChromosomeName(features[0].chr)
        assert.equal(chr, c)

    })


    test("SEG query", async function () {

        this.timeout(100000)

        const genome = createGenome("ucsc")

        const url = "https://s3.amazonaws.com/igv.org.demo/GBM-TP.seg.gz"
        const featureSource = FeatureSource(
            {format: 'seg', url: url, indexed: false},
            genome)
        const chr = "chr1"
        const start = 0
        const end = Number.MAX_SAFE_INTEGER

        const features = await featureSource.getFeatures({chr, start, end})
        assert.ok(features)
        assert.equal(features.length, 8243)
        // Test 1 feature, insure its on chr1
        const c = genome.getChromosomeName(features[0].chr)
        assert.equal(chr, c)


    })


    test("SEG whole genome", async function () {

        this.timeout(100000)

        const genome = createGenome("ucsc")
        const url = "https://s3.amazonaws.com/igv.org.demo/GBM-TP.seg.gz"
        const featureSource = FeatureSource({
            format: 'seg',
            url: url,
            indexed: false,
            //maxWGCount: Number.MAX_SAFE_INTEGER
        }, genome)
        const chr = "all"
        const features = await featureSource.getFeatures({chr})

        assert.ok(features)
        assert.equal((10000), features.length)   // Max # WGF features

        let c = features[0]._f.chr
        assert.equal("1", c)

        c = features[features.length - 1]._f.chr
        assert.equal("24", c)
    })
})

