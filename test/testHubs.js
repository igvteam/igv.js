import "./utils/mockObjects.js"
import {assert} from 'chai'
import Hub from "../js/ucsc/ucscHub.js"
import Trix from "../js/bigwig/trix.js"
import BWReader from "../js/bigwig/bwReader.js"
import BPTree from "../js/bigwig/bpTree.js"
import {isString} from "../node_modules/igv-utils/src/stringUtils.js"


suite("hub.txt", function () {


    test("genome", async function () {

        const hub = await Hub.loadHub("test/data/hubs/hub.txt")
        assert.ok(hub.hub)
        assert.ok(hub.genomeStanza)
        assert.equal(22, hub.trackStanzas.length)

        const genomeConfig = hub.getGenomeConfig()
        //const genome = await Genome.loadGenome(genomeConfig)

        assert.ok(genomeConfig)
        assert.equal("GCF_000186305.1", genomeConfig.id)
        assert.equal("Python bivittatus", genomeConfig.name)
        assert.ok(genomeConfig.twoBitBptURL)
        assert.ok(genomeConfig.twoBitURL)
        assert.ok(genomeConfig.chromAliasBbURL)
        assert.ok(genomeConfig.cytobandBbURL)
    })

    test("track configs", async function () {

        const hub = await Hub.loadHub("test/data/hubs/hub.txt")
        assert.ok(hub.hub)
        assert.ok(hub.genomeStanza)
        assert.equal(22, hub.trackStanzas.length)

        const trackConfigs = hub.getTrackConfigurations()

        assert.ok(trackConfigs.length > 0)

    })


})

