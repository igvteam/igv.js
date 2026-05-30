import "./utils/mockObjects.js"
import FeatureSource from "../js/feature/featureSource.js"
import {assert} from 'chai'
import {createGenome} from "./utils/MockGenome.js"

const genome = createGenome()
import Browser from "../js/browser.js"

suite("testGCNV", function () {

    test("gcnv", async function () {

        const featureSource = FeatureSource({
                url: "test/data/gcnv/gcnv_track_example_data.chr22.bed"
            },
            genome
        )


        const trackType = await featureSource.trackType()
        const header = await featureSource.getHeader()

        assert.equal(header.format, "gcnv")
        assert.equal(trackType, "gcnv")
        assert.equal(header.columnNames.length, 172)
        assert.equal(header.highlight.length, 2)

        const features = await featureSource.getFeatures({chr: "chr22", start: 0, end: Number.MAX_SAFE_INTEGER})
        assert.equal(features.length, 10)

    })

    test("long lines", async function () {

        const featureSource = FeatureSource({
                url: "test/data/gcnv/gcnv_large.bed.gz",
                indexURL: "test/data/gcnv/gcnv_large.bed.gz.tbi",
                format: 'gcnv',
            },
            genome
        )


        await featureSource.getHeader()
        const features = await featureSource.getFeatures({chr: "chr1", start: 925630, end: 926111})
        assert.equal(features.length, 2)

    })


})

