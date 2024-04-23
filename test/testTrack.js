import "./utils/mockObjects.js"
import {assert} from 'chai'
import WigTrack from "../js/feature/wigTrack.js"
import BAMTrack from "../js/bam/bamTrack.js"
import VariantTrack from "../js/variant/variantTrack.js"
import InteractionTrack from "../js/feature/interactionTrack.js"
import BlatTrack from "../js/blat/blatTrack.js"
import FeatureTrack from "../js/feature/featureTrack.js"
import {createGenome} from "./utils/MockGenome.js"

const genome = createGenome()

suite("test getState()", function () {

    const browser = {genome}

    test("wig track default state", async function () {

        const path = "test/data/wig/noTrackProperties.wig"

        const config = {format: 'wig', url: path}
        const track = new WigTrack(config, browser)
        await track.postInit()

        // Assert properties are == default value
        const defaults = WigTrack.defaults
        for (let key of Object.keys(defaults)) {
            assert.equal(track[key], defaults[key])
        }

        // Assert properties are not recorded in "state"

        let state = track.getState()
        assert.equal(state.height, undefined)
        assert.equal(state.flipAxis, undefined)
        assert.equal(state.logScale, undefined)

        // Change properties, should now be recorded in state
        track.height = 100
        track.flipAxis = true
        track.logScale = true

        state = track.getState()
        assert.equal(state.height, 100)
        assert.equal(state.flipAxis, true)
        assert.equal(state.logScale, true)
    })

    //track type=wiggle_0 graphType=points name="truc" description="une description" visibility=full color=50,150,255 yLineMark=11.76 yLineOnOff=on viewLimits=0:200
    test("wig track state with track line", async function () {

        const path = "test/data/wig/trackLine.wig"

        const config = {url: path}
        const track = new WigTrack(config, browser)
        await track.postInit()

        const trackLineProperties = new Set(["graphType", "color", "autoscale"])

        // Assert properties are == default value
        const defaults = WigTrack.defaults
        for (let key of Object.keys(defaults)) {
            if (trackLineProperties.has(key)) continue
            assert.equal(track[key], defaults[key], key)
        }

        // Check trackLine properties
        assert.equal(track.graphType, "points")
        assert.equal(track.color, 'rgb(50,150,255)')
        assert.equal(track.autoscale, false)
        assert.equal(track.dataRange.min, 0)
        assert.equal(track.dataRange.max, 200)
    })

    test("wig track state with track line and config", async function () {

        const path = "test/data/wig/trackLine.wig"

        const config = {
            url: path,
            graphType: "line",
            autoscale: true
        }
        const track = new WigTrack(config, browser)
        await track.postInit()

        const trackLineProperties = new Set(["graphType", "color", "autoscale"])

        // Assert properties are == default value
        const defaults = WigTrack.defaults
        for (let key of Object.keys(defaults)) {
            if (trackLineProperties.has(key)) continue
            assert.equal(track[key], defaults[key], key)
        }

        // Check config properties -- these have precedence over track line
        assert.equal(track.graphType, "line")
        assert.equal(track.color, 'rgb(50,150,255)')
        assert.equal(track.autoscale, true)
    })

    test("bam track state", async function () {

        const path = "test/data/bam/gstt1_sample.bam"

        const config = {url: path, indexed: false}
        const track = new BAMTrack(config, browser)

        // Assert properties are == default values
        const defaults = BAMTrack.defaults
        for (let key of Object.keys(defaults)) {
            assert.equal(track[key], defaults[key])
        }

        // All properties are default => should not be in "state"
        const stateProperties = new Set(Object.keys(track.getState()))
        for (let key of Object.keys(defaults)) {
            assert(!stateProperties.has(key))
        }

        // Change some properties and assert that they are recorded in "state"
        track.showCoverage = false
        track.alignmentTrack.viewAsPairs = true
        const state = track.getState()
        assert.equal(state.showCoverage, false)
        assert.equal(state.viewAsPairs, true)

    })

    test("vcf track state", async function () {

        const path = "test/data/vcf/example.vcf"

        const config = {url: path, indexed: false}
        const track = new VariantTrack(config, browser)

        // Assert properties are == default values
        const defaults = VariantTrack.defaults
        for (let key of Object.keys(defaults)) {
            assert.equal(track[key], defaults[key])
        }

        // All properties are default => should not be in "state"
        const stateProperties = new Set(Object.keys(track.getState()))
        for (let key of Object.keys(defaults)) {
            assert(!stateProperties.has(key))
        }

        // Change some properties and assert that they are recorded in "state"
        track.visibilityWindow = 1000
        const state = track.getState()
        assert.equal(state.visibilityWindow, 1000)
    })

    test("interaction track state", async function () {

        const path = "test/data/bedpe/hg19_myc.bedpe"

        const config = {url: path}
        const track = new InteractionTrack(config, browser)

        // Assert properties are == default values
        const defaults = InteractionTrack.defaults
        for (let key of Object.keys(defaults)) {
            assert.equal(track[key], defaults[key])
        }

        // All properties are default => should not be in "state"
        const stateProperties = new Set(Object.keys(track.getState()))
        for (let key of Object.keys(defaults)) {
            assert(!stateProperties.has(key))
        }

        // Change some properties and assert that they are recorded in "state"
        track.showBlocks = false
        const state = track.getState()
        assert.equal(state.showBlocks, false)

    })

    /**
     * BlatTrack is extended from FeatureTrack.  Verify that BlatTrack inherits FeatureTrack default properties*
     */
    test("blat track state", async function () {


        const config = {sequence: ''}
        const track = new BlatTrack(config, browser)

        // Assert properties are == default values
        const defaults = FeatureTrack.defaults
        for (let key of Object.keys(defaults)) {
            assert.equal(track[key], defaults[key])
        }


    })

})