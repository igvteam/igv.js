import "../utils/mockObjects.js"
import {assert} from 'chai'
import HtsgetBamReader from "../../js/htsget/htsgetBamReader.js"
import HtsgetVariantReader from "../../js/htsget/htsgetVariantReader.js"
import Browser from "../../js/browser.js"


// Mock genome with "1,2,3..." name convention
const genome1 = {
    getChromosomeName: function (c) {
        return c.startsWith("chr") ? c.substring(3) : c
    }
}

// Mock genome with "chr1,chr2,chr33..." name convention
const genome2 = {
    getChromosomeName: function (c) {
        return c.startsWith("chr") ? c : "chr" + c
    }
}

suite("htsget", function () {

    /**
     * Minimal tests of htsget -- just verifies that something parsable as a BAM record is returned.
     */

    test("bam", async function() {

        this.timeout(10000)

        const trackConfig = {
            sourceType: 'htsget',
            format: 'bam',
            url: 'https://htsget.demo.umccr.org/reads/org.umccr.demo.htsget-rs-data/bam/htsnexus_test_NA12878'
        }

        // Test reading some alignments
        const reader = new HtsgetBamReader(trackConfig, genome1)
        let alignmentContainer = await reader.readAlignments('11', 5020134, 5020614)
        assert.equal(929, alignmentContainer.alignments.length)

        // Repeat with chromosome alias
        alignmentContainer = await reader.readAlignments('11', 5020134, 5020614)
        assert.equal(929, alignmentContainer.alignments.length)

    })

    test("bam endpoint + id (deprecated)", async function() {

        this.timeout(10000)

        const trackConfig = {
            sourceType: 'htsget',
            format: 'bam',
            endpoint: 'https://htsget.demo.umccr.org/reads/org.umccr.demo.htsget-rs-data/bam/',
            id: 'htsnexus_test_NA12878'
        }

        // Test reading some alignments
        const reader = new HtsgetBamReader(trackConfig, genome1)
        let alignmentContainer = await reader.readAlignments('11', 5020134, 5020614)
        assert.equal(929, alignmentContainer.alignments.length)

    })

    test("bam -- missing format", async function() {

        this.timeout(10000)

        const trackConfig = {
            sourceType: 'htsget',
            url: 'https://htsget.demo.umccr.org/reads/org.umccr.demo.htsget-rs-data/bam/htsnexus_test_NA12878'
        }

        // Format is infered in the "createTrack function
        await Browser.prototype.createTrack.call(this, trackConfig)

        // Test reading some alignments
        const reader = new HtsgetBamReader(trackConfig, genome1)
        let alignmentContainer = await reader.readAlignments('11', 5020134, 5020614)
        assert.equal(929, alignmentContainer.alignments.length)

    })


    test("Variants", async function () {

        // this.timeout(40000)
        //
        // const trackConfig = {
        //     sourceType: 'htsget',
        //     format: "VCF",
        //     endpoint: 'https://htsget.demo.umccr.org/variants/org.umccr.demo.sbeacon-data/CINECA_UK1/',
        //     id: 'Test.1000G.phase3.joint.lifted'
        // }
        //
        // //chr1:65,242,370-65,244,749
        //
        // const reader = new HtsgetVariantReader(trackConfig, genome1)
        // const variants = await reader.readFeatures("1", 65242370, 65244749)
        // console.log(variants)
        // assert.equal(11, variants.length)
        //
        // const reader2 = new HtsgetVariantReader(trackConfig, genome2)
        // const variants2 = await reader2.readFeatures("chr8", 128732400, 128770475)
        // assert.equal(11, variants2.length)

    })

    test("Variants - single chromosome", async function () {

        // this.timeout(40000)
        //
        // const trackConfig = {
        //     sourceType: 'htsget',
        //     format: "VCF",
        //     endpoint: 'https://htsget.ga4gh.org/variants/',
        //     id: '1000genomes.phase1.chr22'
        // }
        //
        // const reader2 = new HtsgetVariantReader(trackConfig, genome2)
        // const variants2 = await reader2.readFeatures("chr22", 0, 25853851)
        // assert.equal(46, variants2.length)

    })

})
