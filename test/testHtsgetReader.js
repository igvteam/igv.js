import "./utils/mockObjects.js"
import {assert} from 'chai'
import HtsgetBamReader from "../js/htsget/htsgetBamReader.js"
import HtsgetVariantReader from "../js/htsget/htsgetVariantReader.js"
import Browser from "../js/browser.js"
import {createGenome} from "./utils/MockGenome.js"

// Mock genome with "chr1, chr2, chr3 ..." name convention
const genome = createGenome("ucsc")

suite("htsget", function () {

    /**
     * Minimal tests of htsget -- just verifies that something parsable as a BAM record is returned.
     */

    test("bam", async function() {

        this.timeout(40000)

        const trackConfig = {
            sourceType: 'htsget',
            format: 'bam',
            url: 'https://htsget.ga4gh-demo.org/reads/htsnexus_test_NA12878'
        }

        // Test reading some alignments
        const reader = new HtsgetBamReader(trackConfig, genome)
        let alignmentContainer = await reader.readAlignments('chr11', 5020134, 5020614)
        const alignmentCount = alignmentContainer.alignments.length
        assert.ok(alignmentCount > 0, "No alignments returned")

    })

    test("Variants", async function () {

        this.timeout(40000)

        const trackConfig = {
            sourceType: 'htsget',
            format: "VCF",
            url: 'https://htsget.ga4gh-demo.org/variants/spec-v4.3'
        }

        const reader = new HtsgetVariantReader(trackConfig, genome)
        const header = await reader.readHeader()
        assert.ok(header, "Header should be defined")

        const variants = await reader.readFeatures("chr20", 0, 10000000)
        assert.ok(variants.length)

    })

})
