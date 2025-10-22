import "./utils/mockObjects.js"
import FeatureSource from "../js/feature/featureSource.js"
import {assert} from 'chai'
import {createGenome} from "./utils/MockGenome.js"
import {summarizeData} from "../js/feature/wigTrack.js"

const genome = createGenome()

suite("testWig", function () {

    test("wig fixed step", async function () {

        const path = "test/data/wig/fixedStep-example.wig"

        const featureSource = FeatureSource(
                {format: 'wig', url: path},
                genome),
            chr = "chr19",
            start = 49300000,
            end = 49400000

        const features = await featureSource.getFeatures({chr, start, end})
        assert.equal(features.length, 10)
        //fixedStep chrom=chr19 start=49307401 step=300 span=200
        // fixedStep uses 1-based coordinate, igv.js uses 0-based
        assert.equal(features[0].start, 49307400)
        assert.equal(features[0].end - features[0].start, 200)
        assert.equal(features[1].start - features[0].start, 300)
    })

    test("wig variable step", async function () {

        const url = "test/data/wig/variableStep-example.wig"

        const wigFeatureSource = FeatureSource(
            {format: 'wig', url: url},
            genome)
        //variableStep chrom=chr19 span=150
        const wigStarts = [49304701, 49304901, 49305401, 49305601, 49305901, 49306081, 49306301, 49306691, 49307871]
        const values = [10.0, 12.5, 15.0, 17.5, 20.0, 17.5, 15.0, 12.5, 10.0]
        const span = 150

        const chr = "chr19"
        const start = 49304200
        const end = 49310700

        const features = await wigFeatureSource.getFeatures({chr, start, end})
        assert.equal(features.length, 9)
        //fixedStep chrom=chr19 start=49307401 step=300 span=200
        features.forEach(function (feature, index) {
            assert.equal(feature.start, wigStarts[index] - 1)
            assert.equal(feature.end, wigStarts[index] - 1 + span)
            assert.equal(feature.value, values[index])

        })
    })

    /**
     * Insure we get all features requested, but no more (i.e. no features out of interval)
     */
    test("wig query", async function () {

        const url = "test/data/wig/ENCFF000ARZ.wig"

        const wigFeatureSource = FeatureSource({format: 'wig', url: url}, genome)

        const chr = "chr8"
        const allFeatures = await wigFeatureSource.getFeatures({chr})
        assert.equal(allFeatures.length, 127840)
        assert.equal(allFeatures[allFeatures.length - 1].start, 63919400)

        const start = 60879301 + 10
        const end = 60879526 + 10
        const queryFeatures = await wigFeatureSource.getFeatures({chr, start, end})
        assert.equal(10, queryFeatures.length)
    })

    test("wig summarize", async function () {

        const url = "test/data/wig/ENCFF000ARZ.wig"

        const wigFeatureSource = FeatureSource({format: 'wig', url: url}, genome)


        //chr8:61,424,086-62,080,568
        const chr = "chr8"
        const start = 61424086
        const end = 62080568

        const bpPerPixel = (end - start) / 1000
        const binSize = bpPerPixel


        const features = await wigFeatureSource.getFeatures({chr, start, end})
        assert.equal(features.length, 24546)

        let windowFunction = "mean"
        let summarizedData = summarizeData(features, start, bpPerPixel, windowFunction)
        assert.equal(summarizedData.length, 992)

        windowFunction = "min"
        summarizedData = summarizeData(features, start, bpPerPixel, windowFunction)
        assert.equal(summarizedData.length, 944)

        windowFunction = "max"
        summarizedData = summarizeData(features, start, bpPerPixel, windowFunction)
        assert.equal(summarizedData.length, 953)

        windowFunction = "none"
        summarizedData = summarizeData(features, start, bpPerPixel, windowFunction)
        assert.equal(summarizedData.length, 24546)

        // first bin
        // console.log(features[0].start)
        // const binEnd = start + bpPerPixel
        // let sum = 0
        // let count = 0
        // let max = 0
        //
        // const first = summarizedData[0]
        // const firstBinStart = first.start
        // const firstBinEnd = first.end
        //
        // for(let f of features) {
        //     if(f.end < firstBinStart) continue
        //     if(f.start > firstBinEnd) break
        //     max = Math.max(f.value, max)
        //     sum += f.value
        //     count++
        // }
        // const avg = sum / count
        //
        // console.log(`bpPerPixel = ${bpPerPixel}     first bin size = ${summarizedData[0].end-summarizedData[0].start}`)
        // console.log(`${start}-${binEnd}   ${summarizedData[0].start}-${summarizedData[0].end}`)
        // console.log(`${avg}  ${max}  ${summarizedData[0].value}`)


    })
})