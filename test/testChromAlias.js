import "./utils/mockObjects.js"
import ChromAliasFile from "../js/genome/chromAliasFile.js"
import BWReader from "../js/bigwig/bwReader.js"
import {assert} from "chai"
import ChromAliasDefaults from "../js/genome/chromAliasDefaults.js"
import ChromAliasBB from "../js/genome/chromAliasBB.js"


suite("chromAlias", function () {

    const genome = {
        chromosomes: new Map([
            ["NC_007194.1", {name: "NC_007194.1", bpLength: 1}],
            ["NC_007195.1", {name: "NC_007195.1", bpLength: 1}],
            ["NC_007196.1", {name: "NC_007196.1", bpLength: 1}],
            ["NC_007197.1", {name: "NC_007197.1", bpLength: 1}],
            ["NC_007198.1", {name: "NC_007198.1", bpLength: 1}],
            ["NC_007199.1", {name: "NC_007199.1", bpLength: 1}],
            ["NC_007200.1", {name: "NC_007200.1", bpLength: 1}],
            ["NC_007201.1", {name: "NC_007201.1", bpLength: 1}]
        ]),
        getChromosomeName: function (name) {
            return name
        }
    }

    /**
     * Test a UCSC style chrom alias flat file
     *
     * # refseq	assembly	genbank	ncbi	ucsc
     * NC_007194.1	1	CM000169.1	1	chr1
     * NC_007195.1	2	CM000170.1	2	chr2
     * NC_007196.1	3	CM000171.1	3	chr3
     * NC_007197.1	4	CM000172.1	4	chr4
     * NC_007198.1	5	CM000173.1	5	chr5
     * NC_007199.1	6	CM000174.1	6	chr6
     * NC_007200.1	7	CM000175.1	7	chr7
     * NC_007201.1	8	CM000176.1	8	chr8
     */
    test("test chromAlias.txt", async function () {

        const url = "test/data/genomes/GCF_000002655.1.chromAlias.txt"

        const chromAlias = new ChromAliasFile(url, {}, genome)
        const chromAliasRecord = await chromAlias.search("1")
        assert.equal(chromAliasRecord.chr, "NC_007194.1")
        assert.equal(chromAliasRecord.genbank, "CM000169.1")
        assert.equal(chromAliasRecord.ncbi, "1")
        assert.equal(chromAliasRecord.ucsc, "chr1")

        assert.equal(chromAlias.getChromosomeAlias("NC_007194.1", "genbank"), "CM000169.1")
    })

    test("test chromAlias.bb", async function () {

        const url = "test/data/genomes/GCF_000002655.1.chromAlias.bb"

        const chromAlias = new ChromAliasBB(url, {}, genome)
        const chromAliasRecord = await chromAlias.search("1")
        assert.equal(chromAliasRecord.chr, "NC_007194.1")
        assert.equal(chromAliasRecord.genbank, "CM000169.1")
        assert.equal(chromAliasRecord.ncbi, "1")
        assert.equal(chromAliasRecord.ucsc, "chr1")
        assert.equal(chromAlias.getChromosomeAlias("NC_007194.1", "genbank"), "CM000169.1")

        const chromosomeNames = await chromAlias.getChromosomeNames()
        assert.equal(chromosomeNames.length, 8)
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


    test("test defaults", async function () {

        const genomeID = "hg*"

        // NCBI convention
        let chrNames = []
        for (let i = 1; i < 25; i++) {
            chrNames.push(i.toString())
        }
        chrNames.push("MT")

        let chromAlias = new ChromAliasDefaults(genomeID, chrNames)
        let chromAliasRecord = await chromAlias.search("chr1")
        assert.equal(chromAliasRecord.chr, "1")
        assert.equal(chromAlias.getChromosomeName("chrX"), "23")
        assert.equal(chromAlias.getChromosomeName("chrM"), "MT")

        // UCSC convention
        chrNames = []
        for (let i = 1; i < 23; i++) {
            chrNames.push("chr" + i)
            chrNames.push("chrX")
            chrNames.push("chrY")
            chrNames.push("chrM")
        }

        chromAlias = new ChromAliasDefaults(genomeID, chrNames)
        chromAliasRecord = await chromAlias.search("1")
        assert.equal(chromAliasRecord.chr, "chr1")
        assert.equal(chromAlias.getChromosomeName("23"), "chrX")
        assert.equal(chromAlias.getChromosomeName("MT"), "chrM")

        // Other
        assert.equal(chromAlias.getChromosomeName("X"), "chrX")
        assert.equal(chromAlias.getChromosomeName("Y"), "chrY")

    })
})
