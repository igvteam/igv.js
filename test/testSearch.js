import "./utils/mockObjects.js"
import {assert} from 'chai'
import {createGenome} from "./utils/MockGenome.js"

const genome = createGenome()
import {parseLocusString, searchWebService} from "../js/search.js"
import search from "../js/search.js"
import FeatureSource from "../js/feature/featureSource.js"

suite("testSearch", function () {

    const browser = {
        genome: genome,

        tracks: [],

        config: {
            // This looks redundant, but its important for the test
            search: {
                type: "plain",
                url: 'https://igv.org/genomes/locus.php?genome=$GENOME$&name=$FEATURE$',
                coords: 0,
                chromosomeField: "chromosome",
                startField: "start",
                endField: "end",
                geneField: "gene",
                snpField: "snp"
            }
        },

        searchConfig: {
            type: "plain",
            url: 'https://igv.org/genomes/locus.php?genome=$GENOME$&name=$FEATURE$',
            coords: 0,
            chromosomeField: "chromosome",
            startField: "start",
            endField: "end",
            geneField: "gene",
            snpField: "snp"
        },

        isSoftclipped: () => false

    }

    test("locus strings", function () {
        const s1 = "chr1:100-200"
        const locus1 = parseLocusString(s1)
        assert.equal(locus1.chr, "chr1")
        assert.equal(locus1.start, 99)
        assert.equal(locus1.end, 200)


        // Single base
        const s3 = "1:100"
        const locus3 = parseLocusString(s3)
        assert.equal(locus3.chr, "1")
        assert.equal(locus3.start, 79)
        assert.equal(locus3.end, 120)

    })

    test("webservice", async function () {

        this.timeout(10000)

        // myc =>  chr8:127,735,434-127,742,951 (+), chr8:127,736,231-127,742,951 (+)
        const gene = "myc"
        const locus = await searchWebService(browser, gene, browser.searchConfig)
        assert.equal(locus.chr, "chr8")
        assert.equal(locus.start, 127735432)
        assert.equal(locus.end, 127742951)
    })

    test("search (main function)", async function () {

        this.timeout(10000)

        const s1 = "chr1:100-200"
        const s2 = "myc"
        const s3 = "muc1"

        const results = await search(browser, `${s1} ${s2} ${s3}`)

        const locus1 = results[0]
        assert.equal(locus1.chr, "chr1")
        assert.equal(locus1.start, 99)
        assert.equal(locus1.end, 200)

        const locus2 = results[1]
        assert.equal(locus2.chr, "chr8")
        assert.equal(locus2.start, 127735432)
        assert.equal(locus2.end, 127742951)

        const locus3 = results[2]
        assert.equal(locus3.chr, "chr1")
        assert.equal(locus3.start, 155185822)
        assert.equal(locus3.end, 155192915)
    })

    test("search name with spaces from bed file", async function () {

        const config = {
            format: "bed",
            delimiter: "\t",
            url: "test/data/bed/names_with_spaces.bed",
            indexed: false,
            searchable: true,
        }
        const featureSource = FeatureSource(config)
        await featureSource.getFeatures({chr: "1", start: 0, end: Number.MAX_SAFE_INTEGER})

        const mockBrowser = {
            genome: {
                loadChromosome: async (chr) => chr,
                getChromosomeName: (chr) => chr,
                getChromosome: (chr) => {return {name: chr, bpLenght: 0}}
            },
            tracks: [{
                featureSource: featureSource,
                searchable: true,
                search: (term) => featureSource.search(term)
            }]
        }

        const found = await search(mockBrowser, "kan2 marker")
        assert.ok(found)
    })


})

