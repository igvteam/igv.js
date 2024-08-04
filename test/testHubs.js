import "./utils/mockObjects.js"
import {assert} from 'chai'
import Hub from "../js/ucsc/ucscHub.js"
import {convertToHubURL} from "../js/ucsc/ucscUtils.js"


suite("hub.txt", function () {

    const hubURL = convertToHubURL("GCF_000186305.1")

    test("genome config", async function () {

        this.timeout(20000)

        const hub = await Hub.loadHub(hubURL)
        assert.ok(hub.hubStanza)
        assert.ok(hub.genomeStanza)
        assert.equal(22, hub.trackStanzas.length)

        const genomeConfig = hub.getGenomeConfig()
        //const genome = await Genome.loadGenome(genomeConfig)

        assert.ok(genomeConfig)
        assert.equal("GCF_000186305.1", genomeConfig.id)
        assert.equal("Burmese python (GCF_000186305.1)", genomeConfig.name)
        assert.ok(genomeConfig.twoBitBptURL)
        assert.ok(genomeConfig.twoBitURL)
        assert.ok(genomeConfig.chromAliasBbURL)
        assert.ok(genomeConfig.cytobandBbURL)
    })

    test("track configs", async function() {

        this.timeout(20000)

        const hub = await Hub.loadHub(hubURL)
        const groupedTrackConfigurations  = hub.getGroupedTrackConfigurations();
        assert.equal(5, groupedTrackConfigurations.length);
    })



})

