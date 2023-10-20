import "./utils/mockObjects.js"
import {assert} from 'chai'
import Hub from "../js/ucsc/ucscHub.js"
import Trix from "../js/bigwig/trix.js"
import BWReader from "../js/bigwig/bwReader.js"
import BPTree from "../js/bigwig/bpTree.js"
import {isString} from "../node_modules/igv-utils/src/stringUtils.js"


suite("ucsc utilities", function () {


    test("hub.txt", async function () {

        this.timeout(200000)

        const hub = await Hub.loadHub({url: "test/data/hubs/hub.txt"})
        assert.ok(hub.hub)
        assert.ok(hub.genomeStanza)
        assert.equal(22, hub.trackStanzas.length)

        const genomeConfig = hub.getGenomeConfig()
        //const genome = await GenomeUtils.loadGenome(genomeConfig)

        assert.ok(genomeConfig)
        assert.equal("GCF_000186305.1", genomeConfig.id)
        assert.equal("Python bivittatus", genomeConfig.name)
        assert.ok(genomeConfig.twoBitBptURL)
        assert.ok(genomeConfig.twoBitURL)
        assert.ok(genomeConfig.chromAliasBbURL)
        assert.ok(genomeConfig.cytobandBbURL)
    })

    test("trix", async function () {

        this.timeout(200000)
        const ixFile = "test/data/bb/ixIxx/GCF_000009045.1_ASM904v1.ncbiGene.ix"
        const ixxFile = "test/data/bb/ixIxx/GCF_000009045.1_ASM904v1.ncbiGene.ixx"
        const trix = new Trix(ixxFile, ixFile, 10)
        const results = await trix.search("ykoX")
        assert.ok(results)
        const exactMatches = results.get('ykox')
        assert.ok(exactMatches)
        assert.ok(exactMatches[0].startsWith('NP_389226.1'))
        console.log(results)
    })

    test("test gene bb extra index search", async function () {

        const config = {
            url: "test/data/bb/GCF_000009045.1_ASM904v1.ncbiGene.bb",
            format: "bigbed",
            searchTrix: "test/data/bb/ixIxx/GCF_000009045.1_ASM904v1.ncbiGene.ix"
        }

        const bbReader = new BWReader(config)

        // Search by name, which is the index parameter, does not require trix
        const name = 'NP_389226.1'
        const f = await bbReader.search(name)
        assert.equal(f.name.toLowerCase(), name.toLowerCase())


        // Search by alternate name,  does require trix
        const name2 ='ykoX'
        const f2 = await bbReader.search(name2)
        assert.equal(f2.name2.toLowerCase(), name2.toLowerCase())

    })




})

