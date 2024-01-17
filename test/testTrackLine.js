import "./utils/mockObjects.js"
import {assert} from 'chai'
import WigTrack from "../js/feature/wigTrack.js"
import {createGenome} from "./utils/MockGenome.js"

const genome = createGenome()

suite("testTrackLine", function () {

    const browser = {genome}

    //track type=wiggle_0 name="fixedStep" description="fixedStep format" visibility=full autoScale=off viewLimits=0:1000 color=0,200,100 maxHeightPixels=100:50:20 graphType=points priority=20
    test("trackline settings", async function () {

        const path = "test/data/wig/fixedStep-example.wig"

        const config = {format: 'wig', url: path}
        const track = new WigTrack(config, browser)
        await track.postInit()

        assert.equal(track.type, "wig")
        assert.equal(track.name, "fixedStep")
        assert.equal(track.color, "rgb(0,200,100)")
        assert.equal(track.dataRange.max, 1000)
        assert.equal(track.autoscale, false)
        assert.equal(track.height, 50)
        assert.equal(track.maxHeight, 100)
        assert.equal(track.displayMode, "EXPANDED")

        // graphType is not yet supported, when it is uncomment
        // assert.equal(track.graphType, "points");
    })

    test("trackline override", async function () {

        const path = "test/data/wig/fixedStep-example.wig"

        const config = {
            format: 'wig',
            url: path,
            name: 'example wig',
            color: 'blue',
            height: 75,
            autoscale: true
        }
        const track = new WigTrack(config, browser)
        await track.postInit()

        assert.equal(track.type, "wig")
        assert.equal(track.name, "example wig")
        assert.equal(track.color, "blue")
        assert.equal(track.dataRange, undefined)
        assert.equal(track.autoscale, true)
        assert.equal(track.height, 75)
        assert.equal(track.maxHeight, 100)
        assert.equal(track.displayMode, "EXPANDED")

        // graphType is not yet supported, when it is uncomment
        // assert.equal(track.graphType, "points");
    })

})