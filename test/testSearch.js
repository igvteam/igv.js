import "./utils/mockObjects.js"
import {assert} from 'chai'
import fs from "fs"
import {createGenome} from "./utils/MockGenome.js"
import search, {parseLocusString, searchWebService} from "../js/search.js"
import FeatureSource from "../js/feature/featureSource.js"
import {searchFeatures} from "../js/searchFeatures.js"
import {igvxhr} from "../node_modules/igv-utils/src/index.js"

const genome = createGenome()

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
        assert.isUndefined(locus1.name)

        const locus2 = results[1]
        assert.equal(locus2.chr, "chr8")
        assert.equal(locus2.start, 127735432)
        assert.equal(locus2.end, 127742951)
        assert.equal(locus2.name, 'MYC')

        const locus3 = results[2]
        assert.equal(locus3.chr, "chr1")
        assert.equal(locus3.start, 155185822)
        assert.equal(locus3.end, 155192916)
        assert.equal(locus3.name, 'MUC1')
    })

    test("search name with spaces from bed file", async function () {

        const config = {
            format: "bed",
            delimiter: "\t",
            url: "test/data/bed/names_with_spaces.bed",
            indexed: false,
            searchable: true
        }
        const featureSource = FeatureSource(config)
        await featureSource.getFeatures({chr: "1", start: 0, end: Number.MAX_SAFE_INTEGER})

        const mockBrowser = {
            genome: {
                loadChromosome: async (chr) => {
                    return "chr1" === chr ? {name: chr, bpLength: Number.MAX_SAFE_INTEGER} : undefined
                },
                getChromosomeName: (chr) => chr,
                getChromosome: (chr) => {
                    return "chr1" === chr ? {name: chr, bpLength: Number.MAX_SAFE_INTEGER} : undefined
                },
                getManeTranscript() {
                    return null
                }
            },
            tracks: [{
                featureSource: featureSource,
                searchable: true,
                search: (term) => featureSource.search(term)
            }]
        }

        const found = await search(mockBrowser, "kan2 marker")
        assert.equal(found.length, 1)
        const locus = found[0]
        assert.equal(locus.chr, "chr1")
        assert.equal(locus.start, 1849)
        assert.equal(locus.end, 2665)
        assert.equal(locus.name, 'KAN2 MARKER')

        assert.ok(found)
    })


    /**
     * Searchable non-indexed tracks build their name index when the file is read.  Search must work before the
     * track is first drawn, e.g. for an initial locus.  See issue #2105
     */
    test("search non-indexed searchable track", async function () {

        const featureSource = FeatureSource({
            url: "test/data/bed/myc.refgene",
            format: "refgene",
            searchable: true
        }, genome)
        const track = {
            searchable: true,
            featureSource,
            search: name => featureSource.search(name)
        }
        const trackBrowser = {genome, tracks: [track], config: {search: false}}

        const feature = await searchFeatures(trackBrowser, "MYC")
        assert.ok(feature)
        assert.equal(feature.chr, "chr8")
        assert.equal(feature.start, 127735433)
    })

    test("search non-indexed searchable track with missing file", async function () {

        const featureSource = FeatureSource({
            url: "test/data/bed/doesNotExist.refgene",
            format: "refgene",
            searchable: true
        }, genome)

        assert.isUndefined(await featureSource.search("MYC"))
    })

    test("webservice not-found results are cached", async function () {

        const searchConfig = {type: "plain", url: "test/data/search_$FEATURE$.tmp.txt", coords: 0}
        const file = "test/data/search_NOSUCHGENE.tmp.txt"
        fs.writeFileSync(file, "")   // Empty response => not found
        try {
            assert.isUndefined(await searchWebService(browser, "nosuchgene", searchConfig))
        } finally {
            fs.unlinkSync(file)
        }

        // Response file is gone, a second request would throw.  Expect the cached miss instead.
        assert.isUndefined(await searchWebService(browser, "nosuchgene", searchConfig))
    })

    test("webservice that times out is rested", async function () {

        const searchConfig = {type: "plain", url: "https://slow.example/a?name=$FEATURE$", coords: 0, timeout: 100}
        const loadString = igvxhr.loadString
        const now = Date.now
        let time = 1000
        Date.now = () => time
        const requests = []
        igvxhr.loadString = async (url, options) => {
            requests.push({url, options})
            time += options.timeout    // The request takes the whole timeout
            const error = new Error("timeout")
            error.status = 0
            throw error
        }
        const fails = async (term, config = searchConfig) => {
            try {
                await searchWebService(browser, term, config)
                return false
            } catch (e) {
                return true
            }
        }
        try {
            assert.isTrue(await fails("gene1"))
            assert.equal(requests[0].options.timeout, 100)

            // The service is not tried again, for this or other terms, and says so by failing
            assert.isTrue(await fails("gene2"))
            assert.isTrue(await fails("gene1"))
            assert.equal(requests.length, 1)

            // ... until some time has passed
            time += 10 * 60 * 1000
            assert.isTrue(await fails("gene2"))
            assert.equal(requests.length, 2)

            // A timeout is set when the config has none
            await fails("gene1", {type: "plain", url: "https://slow.example/b?name=$FEATURE$", coords: 0})
            assert.isAbove(requests[2].options.timeout, 0)
        } finally {
            igvxhr.loadString = loadString
            Date.now = now
        }
    })

    test("webservice error for one term does not rest the service", async function () {

        // Status 0 that comes back at once is not a timeout, it could be an error response blocked by CORS
        const searchConfig = {type: "plain", url: "https://failing.example/?name=$FEATURE$", coords: 0}
        const loadString = igvxhr.loadString
        let requests = 0
        igvxhr.loadString = async () => {
            requests++
            const error = new Error("blocked")
            error.status = 0
            throw error
        }
        try {
            await searchWebService(browser, "gene1", searchConfig).catch(() => {})
            await searchWebService(browser, "gene2", searchConfig).catch(() => {})
            assert.equal(requests, 2)
        } finally {
            igvxhr.loadString = loadString
        }
    })

    test("search non-indexed searchable track, genome without chromosomeNames", async function () {

        // Genome with no chromosome list, only the chromosome loaded for the initial locus
        const sparseGenome = createGenome()
        sparseGenome.chromosomeNames = undefined
        sparseGenome.chromosomes = new Map([["chr1", sparseGenome.chromosomes.get("chr1")]])

        const featureSource = FeatureSource({
            url: "test/data/bed/myc.refgene",
            format: "refgene",
            searchable: true
        }, sparseGenome)

        const feature = await featureSource.search("MYC")
        assert.ok(feature)
        assert.equal(feature.chr, "chr8")
    })
})

