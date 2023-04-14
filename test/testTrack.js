import "./utils/mockObjects.js"
import {assert} from 'chai'
import WigTrack from "../js/feature/wigTrack.js"
import {genome} from "./utils/Genome.js"

suite("test getState()", function () {

    const browser = {genome}

    //track type=wiggle_0 name="fixedStep" description="fixedStep format" visibility=full autoScale=off viewLimits=0:1000 color=0,200,100 maxHeightPixels=100:50:20 graphType=points priority=20
    test("track state", async function () {

        const path = "test/data/wig/fixedStep-example.wig"

        const config = {format: 'wig', url: path}
        const track = new WigTrack(config, browser)
        await track.postInit()


        // Assert properties are == default values, and not recorded in "state"
        assert.equal(track.height, 50)
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


})