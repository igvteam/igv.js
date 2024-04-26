import "./utils/mockObjects.js"
import {assert} from 'chai'
import Hub from "../js/ucsc/ucscHub.js"
import Trix from "../js/bigwig/trix.js"
import BWReader from "../js/bigwig/bwReader.js"

suite("ucsc utilities", function () {

    test("trix", async function () {

        this.timeout(200000)
        const ixFile = "test/data/bb/ixIxx/GCF_000009045.1_ASM904v1.ncbiGene.ix"
        const ixxFile = "test/data/bb/ixIxx/GCF_000009045.1_ASM904v1.ncbiGene.ixx"
        const trix = new Trix(ixxFile, ixFile)
        const results = await trix.search("ykoX")
        assert.ok(results)

        const exactMatches = results.get('ykox')
        assert.ok(exactMatches)
        assert.ok(exactMatches[0].startsWith('NP_389226.1'))
        console.log(results)

        const nomatches = await trix.search("zzzz");
        assert.isUndefined(nomatches);
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

