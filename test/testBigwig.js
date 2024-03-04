import "./utils/mockObjects.js"
import BWSource from "../js/bigwig/bwSource.js"
import BWReader from "../js/bigwig/bwReader.js"
import FeatureSource from "../js/feature/featureSource.js"
import {assert} from 'chai'
import {createGenome} from "./utils/MockGenome.js"

suite("testBigWig", function () {

    test("Uncompressed bigwig", async function () {

        this.timeout(10000)

        //chr21:19,146,376-19,193,466
        const url = "https://s3.amazonaws.com/igv.org.test/data/uncompressed.bw",
            chr = "chr21",
            start = 0,
            end = Number.MAX_SAFE_INTEGER,
            bpPerPixel = 6191354.824    // To match iOS unit test

        const bwReader = new BWReader({url: url})
        const features = await bwReader.readFeatures(chr, start, chr, end, bpPerPixel)
        assert.equal(features.length, 8)   // Verified in iPad app

    })

    test("bigwig", async function () {

        this.timeout(10000)

        //chr21:19,146,376-19,193,466
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


    test("Compressed bigwig", async function () {

        this.timeout(10000)

        //chr21:19,146,376-19,193,466
        const url = "https://hgdownload.soe.ucsc.edu/hubs/GCA/009/914/755/GCA_009914755.4/bbi/GCA_009914755.4_T2T-CHM13v2.0.gc5Base.bw",
            chr = "CP068275.2",
            start = 26490012,
            end = 26490012 + 1,
            bpPerPixel = 1

        const bwReader = new BWReader({url: url})
        const features = await bwReader.readFeatures(chr, start, chr, end, bpPerPixel)
        assert.equal(features.length, 1)   // Verified in iPad app

    })


})