import "./utils/mockObjects.js"
import ChromAliasFile from "../js/genome/chromAliasFile.js"
import BWReader from "../js/bigwig/bwReader.js"
import {assert} from "chai"


suite("chromAlias", function () {

    test("test chromAlias.txt", async function () {

        const url = "test/data/genomes/t2t.chromAlias.txt"

        const chromosomeNames = ["CP068254.1", "CP068255.2", "CP068256.2", "CP068257.2", "CP068258.2", "CP068259.2",
            "CP068260.2", "CP068261.2", "CP068262.2", "CP068263.2", "CP068264.2", "CP068265.2", "CP068266.2",
            "CP068267.2", "CP068268.2", "CP068269.2", "CP068270.2", "CP068271.2", "CP068272.2", "CP068273.2",
            "CP068274.2", "CP068275.2", "CP068276.2", "CP068277.2", "CP086569.2"
        ]

        const chromAlias = new ChromAliasFile(url, {})

        await chromAlias.init(chromosomeNames)


    })

    test("test chromalias bb extra index search", async function () {
        this.timeout(200000)
        const config = {
            url: "test/data/genomes/GCF_000002655.1.chromAlias.bb",
            format: "bigbed"
        }

        const bbReader = new BWReader(config)


        // There are 5 extra indexes, 1 for each alias
        const ncbiName = "3"
        const f1 = await bbReader.search(ncbiName)
        assert.equal(ncbiName, f1.ncbi)

        const ucscName = "chr2"
        const f2 = await bbReader.search(ucscName)
        assert.equal(ucscName, f2.ucsc)
    })

    test("test chromalias bb remote", async function () {
        this.timeout(200000)
        const config = {
            url: "https://hgdownload.soe.ucsc.edu/hubs/GCA/009/914/755/GCA_009914755.4/GCA_009914755.4.chromAlias.bb",
            format: "bigbed"
        }

        const bbReader = new BWReader(config)

        const features = await bbReader.readFeatures("chr1")

        // There are 5 extra indexes, 1 for each alias
        const ncbiName = "3"
        const f1 = await bbReader.search(ncbiName)
        assert.equal(ncbiName, f1.ncbi)

        const ucscName = "chr2"
        const f2 = await bbReader.search(ucscName)
        assert.equal(ucscName, f2.ucsc)
    })
    //                chromAliasBbURL: "https://hgdownload.soe.ucsc.edu/hubs/GCA/009/914/755/GCA_009914755.4/GCA_009914755.4.chromAlias.bb",
})
