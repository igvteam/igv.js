import "./utils/mockObjects.js"
import {assert} from 'chai'
import HtsgetBamReader from "../js/htsget/htsgetBamReader.js"
import HtsgetVariantReader from "../js/htsget/htsgetVariantReader.js"


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


    test("BAM", async function () {

        this.timeout(40000)

        const trackConfig = {
            sourceType: 'htsget',
            format: 'bam',
            endpoint: 'https://htsget.demo.umccr.org/reads/org.umccr.demo.htsget-rs-data/bam/',
            id: 'htsnexus_test_NA12878'
        }


        const reader = new HtsgetBamReader(trackConfig, genome1)
        const alignmentContainer = await reader.readAlignments('11', 4999976, 4999999)
        assert.equal(3, alignmentContainer.alignments.length)

        const reade2 = new HtsgetBamReader(trackConfig, genome2)
        const alignmentContainer2 = await reader.readAlignments('chr11', 4999976, 4999999)
        assert.equal(3, alignmentContainer2.alignments.length)
    })

    test("CRAM", async function () {

        this.timeout(40000)

        const trackConfig = {
            sourceType: 'htsget',
            format: 'bam',
            endpoint: 'https://htsget.demo.umccr.org/reads/org.umccr.demo.htsget-rs-data/cram/',
            id: 'htsnexus_test_NA12878'
        }


        const reader = new HtsgetBamReader(trackConfig, genome1)
        const alignmentContainer = await reader.readAlignments('11', 5011840, 5014280)
        assert.equal(3, alignmentContainer.alignments.length)


    })

    // test("BAM alignments", async function () {
    /**
     * Minimal tests of htsget -- just verifies that something parsable as a BAM record is returned.
     */

    /**
     * Full URL
     */
    // test("Full URL", async function () {
    //
    //     this.timeout(40000)
    //
    //     const trackConfig = {
    //         sourceType: 'htsget',
    //         format: 'bam',
    //         url: 'https://htsget.ga4gh.org/reads/giab.NA12878.NIST7086.1'
    //     }
    //
    //     const reader = new HtsgetBamReader(trackConfig, genome1)
    //     const alignmentContainer = await reader.readAlignments('1', 10000, 10100)
    //     assert.equal(7, alignmentContainer.alignments.length)
    // })
    //
    // /**
    //  * Endpoint form
    //  */
    // test("Endpoint + ID", async function () {
    //
    //     this.timeout(40000)
    //
    //     const trackConfig = {
    //         sourceType: 'htsget',
    //         format: 'bam',
    //         endpoint: 'https://htsget.demo.umccr.org/reads',
    //         id: '/org.umccr.demo.htsget-rs-data/bam/htsnexus_test_NA12878'
    //     }
    //
    //     const reader = new HtsgetBamReader(trackConfig, genome1)
    //     const alignmentContainer = await reader.readAlignments('22', 1, 10100)
    //     assert.equal(7, alignmentContainer.alignments.length)
    //
    //     const reade2 = new HtsgetBamReader(trackConfig, genome2)
    //     const alignmentContainer2 = await reader.readAlignments('22', 10000, 10100)
    //     assert.equal(7, alignmentContainer2.alignments.length)
    // })
    //

    test("Variants - header", async function () {

        this.timeout(40000)

        const trackConfig = {
            sourceType: 'htsget',
            format: "VCF",
            endpoint: 'https://htsget.demo.umccr.org/variants',
            id: '/org.umccr.demo.sbeacon-data/CINECA_UK1/Test.1000G.phase3.joint.lifted'
        }

        const reader = new HtsgetVariantReader(trackConfig, genome1)
        const header = await reader.readHeader()
        assert.ok(header)
        assert.equal(2504, header.callSets.length)

    })


    test("Variants", async function () {

        this.timeout(40000)

        const trackConfig = {
            sourceType: 'htsget',
            format: "VCF",
            endpoint: 'https://htsget.demo.umccr.org/variants',
            id: '/org.umccr.demo.sbeacon-data/CINECA_UK1/Test.1000G.phase3.joint.lifted'
        }

        const reader = new HtsgetVariantReader(trackConfig, genome1)
        const variants = await reader.readFeatures("1", 65242370, 65244749)
        console.log(variants)
        assert.equal(11, variants.length)

        const reader2 = new HtsgetVariantReader(trackConfig, genome2)
        const variants2 = await reader2.readFeatures("chr8", 128732400, 128770475)
        assert.equal(11, variants2.length)


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
