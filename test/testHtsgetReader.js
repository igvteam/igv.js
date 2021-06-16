import "./utils/mockObjects.js"
import {assert} from 'chai';
import HtsgetBamReader from "../js/htsget/htsgetBamReader.js";
import HtsgetVariantReader from "../js/htsget/htsgetVariantReader";


// Mock genome with "1,2,3..." name convention
const genome1 = {
    getChromosomeName: function (c) {
        return c.startsWith("chr") ? c.substring(3) : c;
    }
}

// Mock genome with "chr1,chr2,chr33..." name convention
const genome2 = {
    getChromosomeName: function (c) {
        return c.startsWith("chr") ? c : "chr" + c;
    }
}

suite("htsget", function () {


    /**
     * Minimal test of htsget -- just verifies that something parsable as a BAM record is returned.
     */
    test("Alignments - bam", async function () {

        this.timeout(40000);

        const trackConfig = {
            sourceType: 'htsget',
            format: 'bam',
            endpoint: 'https://htsget.ga4gh.org/reads/',
            id: 'giab.NA12878.NIST7086.1'
        }

        const reader = new HtsgetBamReader(trackConfig, genome1);
        const alignmentContainer = await reader.readAlignments('1', 10000, 10100);
        assert.equal(7, alignmentContainer.alignments.length);

        const reade2 = new HtsgetBamReader(trackConfig, genome2);
        const alignmentContainer2 = await reader.readAlignments('chr1', 10000, 10100);
        assert.equal(7, alignmentContainer2.alignments.length);
    })

    /**
     * Full URL
     */
    test("Full URL (url + endpoint + id", async function () {

        this.timeout(40000);

        const trackConfig = {
            sourceType: 'htsget',
            format: 'bam',
            url: 'https://htsget.ga4gh.org/reads/giab.NA12878.NIST7086.1'
        }

        const reader = new HtsgetBamReader(trackConfig, genome1);
        const alignmentContainer = await reader.readAlignments('1', 10000, 10100);
        assert.equal(7, alignmentContainer.alignments.length);
    })

    /**
     * Test deprecated config form for backward compatibility
     */
    test("Deprecated config form (url + endpoint + id", async function () {

        this.timeout(40000);

        const trackConfig = {
            sourceType: 'htsget',
            url: 'https://htsget.ga4gh.org',
            endpoint: '/reads/',
            id: 'giab.NA12878.NIST7086.1'
        }

        const reader = new HtsgetBamReader(trackConfig, genome1);
        const alignmentContainer = await reader.readAlignments('1', 10000, 10100);
        assert.equal(7, alignmentContainer.alignments.length);
    })


    test("Variants", async function () {

        this.timeout(40000);

        const trackConfig = {
            sourceType: 'htsget',
            format: "VCF",
            endpoint: 'https://htsget.ga4gh.org/variants/',
            id: 'giab.NA12878'
        }

        const reader = new HtsgetVariantReader(trackConfig, genome1);
        const variants = await reader.readFeatures("8", 128732400, 128770475);
        assert.equal(11, variants.length);

        const reader2 = new HtsgetVariantReader(trackConfig, genome2);
        const variants2 = await reader2.readFeatures("chr8", 128732400, 128770475);
        assert.equal(11, variants2.length);

    })

    test("Variants - single chromosome", async function () {

        this.timeout(40000);

        const trackConfig = {
            sourceType: 'htsget',
            format: "VCF",
            endpoint: 'https://htsget.ga4gh.org/variants/',
            id: '1000genomes.phase1.chr22'
        }

        const reader2 = new HtsgetVariantReader(trackConfig, genome2);
        const variants2 = await reader2.readFeatures("chr22", 25850101, 25853851);
        assert.equal(46, variants2.length);

    })

})
