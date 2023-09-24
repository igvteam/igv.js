import "./utils/mockObjects.js"
import {assert} from 'chai'
import Hub from "../js/ucsc/ucscHub.js"


suite("ucsc utilities", function () {


    test("hub.txt", async function () {

        this.timeout(200000)

        const hub = await Hub.loadHub({url: "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/186/305/GCF_000186305.1/hub.txt"})
        assert.ok(hub.hub)
        assert.ok(hub.genome)
        assert.equal(22, hub.trackStanzas.length)

        const genomeConfig = hub.getGenomeConfig()
        assert.ok(genomeConfig)
        console.log(genomeConfig)


    })


})