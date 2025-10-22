import "./utils/mockObjects.js"
import FeatureFileReader from "../js/feature/featureFileReader.js"
import FeatureSource from "../js/feature/featureSource.js"
import {assert} from 'chai'
import {createGenome} from "./utils/MockGenome.js"

const genome = createGenome()
import GenomeUtils from "../js/genome/genomeUtils.js"

suite("testBed", function () {

    test("bedmethyl", async function () {
        const config = {
            url: "test/data/bedmethyl/sample.bedmethyl",
            format: "bedmethyl"
        }
        const reader = new FeatureFileReader(config, genome)
        const features = await reader.readFeatures({chr: "chr20", start: 0, end: Number.MAX_SAFE_INTEGER})
        assert.equal(features.length, 100)

        for(let feature of features) {
            assert(Number.isFinite(Number.parseInt(feature["Coverage"])))
            assert(Number.isFinite(Number.parseFloat(feature["% Showing Methylation"])))
        }
    })

    test("bedmethyl - mixed delimiters", async function () {
        const config = {
            url: "test/data/bedmethyl/sample.mixed_delimiters.bedmethyl",
            format: "bedmethyl"
        }
        const reader = new FeatureFileReader(config, genome)
        const features = await reader.readFeatures({chr: "chr20", start: 0, end: Number.MAX_SAFE_INTEGER})
        assert.equal(features.length, 6)

        for(let feature of features) {
            assert(Number.isFinite(Number.parseInt(feature["Coverage"])))
            assert(Number.isFinite(Number.parseFloat(feature["% Showing Methylation"])))
        }
    })


})

