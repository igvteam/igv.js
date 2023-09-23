import "./utils/mockObjects.js"
import {assert} from 'chai'
import {parseHub} from "../js/ucsc/ucscHub.js"
import Hub from "../js/ucsc/ucscHub.js"


suite("ucsc utilities", function () {


    test("hub.txt", async function () {

        this.timeout(200000)

        const hub = await Hub.loadHub("https://hgdownload.soe.ucsc.edu/hubs/GCA/011/100/615/GCA_011100615.1/hub.txt")
        assert.ok(hub.hub)
        assert.ok(hub.genome)
        assert.equal(34, hub.trackStanzas.length)

        const genomeConfig = hub.getGenomeConfig()
        assert.ok(genomeConfig)

        const trackConfigs = hub.getTracksConfigs()
        assert.ok(trackConfigs)
    })


})