import "./utils/mockObjects.js"
import FeatureSource from "../js/feature/featureSource.js"
import FeatureFileReader from "../js/feature/featureFileReader.js"
import {assert} from 'chai'
import {createGenome} from "./utils/MockGenome.js"
import GFFHelper from "../js/feature/gff/gffHelper.js"
import {decodeGFFAttribute, parseAttributeString} from "../js/feature/gff/parseAttributeString.js"

const genome = createGenome()

suite("testGTF", function () {

    const combineFeatures = (features, helper) => {
        const combinedFeatures = helper.combineFeatures(features)
        combinedFeatures.sort(function (a, b) {
            if (a.chr === b.chr) {
                return a.start - b.start
            } else {
                return a.chr.localeCompare(b.chr)
            }
        })
        return combinedFeatures
    }


    test("GTF phase", async function () {

        //-1,-1,0,1,2,0,2,0,0,0,1,

        const featureReader = new FeatureFileReader({
                url: 'test/data/gff/ENST00000380013.9_1.gtf',
                format: 'gtf',
                filterTypes: []
            },
            genome
        )


        // Fetch "raw" features (constituitive parts)
        const features = await featureReader.readFeatures()
        assert.ok(features)
        assert.equal(1, features.length)

        // Expected reading frames from UCSC ncbiRefSeq file
        const expectedReadingFrames = [undefined, undefined, 0, 1, 2, 0, 2, 0, 0, 0, 1]
        features[0].exons.forEach((e, i) => {
            assert.equal(expectedReadingFrames[i], e.readingFrame)
        })


    })

    test("NCBI GTF", async function () {


        const featureReader = new FeatureFileReader({
                url: 'test/data/gff/NCBI_hg38_MYC.gtf',
                format: 'gtf',
                filterTypes: [],
                assembleGFF: false
            },
            genome
        )


        // Fetch "raw" features (constituitive parts)
        const features = await featureReader.readFeatures()
        assert.ok(features)
        assert.equal(19, features.length)

        // Combine features
        const helper = new GFFHelper({format: "gtf"})
        const combinedFeatures = combineFeatures(features, helper)
        assert.equal(2, combinedFeatures.length)

        const transcript1 = combinedFeatures[0]
        const attributes = parseAttributeString(transcript1.attributeString, transcript1.delim)
        let product
        for (let kv of attributes) {
            if (kv[0] === 'product') {
                product = kv[1]
                break
            }
        }
        assert.equal(product, 'MYC proto-oncogene, bHLH transcription factor, transcript variant 2')
    })

    test("gencode lincRNA gtf", async function () {

        const featureReader = new FeatureFileReader({
                url: 'test/data/gff/gencode-lincRNA.gtf',
                format: 'gtf',
                filterTypes: [],
                assembleGFF: false
            },
            genome
        )


        // Fetch "raw" features (constituitive parts)
        const features = await featureReader.readFeatures()
        assert.ok(features)
        assert.equal(10, features.length)

        // Combine features
        const helper = new GFFHelper({format: "gtf"})
        const combinedFeatures = combineFeatures(features, helper)
        assert.equal(2, combinedFeatures.length)
        assert.equal(3, combinedFeatures[0].exons.length)
        assert.equal(3, combinedFeatures[0].exons.length)
    })

    test("Ensembl transcript gtf", async function () {

        const featureReader = new FeatureFileReader({
                url: 'test/data/gff/Ensembl-transcript.gtf',
                format: 'gtf',
                filterTypes: [],
                assembleGFF: false
            },
            genome
        )


        // Fetch "raw" features (constituitive parts)
        const features = await featureReader.readFeatures()
        assert.ok(features)
        assert.equal(7, features.length)

        // Combine features
        const helper = new GFFHelper({format: "gtf"})
        const combinedFeatures = combineFeatures(features, helper)
        assert.equal(1, combinedFeatures.length)
        assert.equal(2, combinedFeatures[0].exons.length)

        // Test coding start/stop
        // -------------------------
        // exon	30663971	30664080
        // CDS	30663971	30664003
        // start_codon	30664001	30664003
        // UTR	30664004	30664080
        // --------------------------
        // exon	30666807	30667353
        // UTR	30666807	30667353

        const firstExon = combinedFeatures[0].exons[0]
        assert.equal(firstExon.cdStart, 30663971 - 1)
        assert.equal(firstExon.cdEnd, 30664003)

        const secondExon = combinedFeatures[0].exons[1]
        assert.equal(secondExon.utr, true)   // Entire exon is UTR

    })

    test("washU gtf", async function () {

        const featureReader = new FeatureFileReader({
                url: 'test/data/gff/wustl.gtf',
                format: 'gtf',
                filterTypes: [],
                assembleGFF: false
            },
            genome
        )


        // Fetch "raw" features (constituitive parts)
        const features = await featureReader.readFeatures()
        assert.ok(features)
        assert.equal(24, features.length)

        // Combine features
        const helper = new GFFHelper({format: "gtf"})
        const combinedFeatures = combineFeatures(features, helper)
        assert.equal(5, combinedFeatures.length)
        assert.equal(5, combinedFeatures[0].exons.length)


        // Check second transcript

        /*
        3UTR	    65149	65487

        3UTR	    66823	66992
        stop_codon	66993	66995
        CDS	        66996	66999

        CDS	        70207	70294

        CDS	        71696	71807
        start_codon	71805	71806

        start_codon	73222	73222
        CDS	        73222	73222
        5UTR	    73223	73504
         */

        const t2 = combinedFeatures[4]
        assert.equal(t2.cdStart, 66992)   // By convention leftmost end of CDS, not 5', and IGV includes stop codon
        assert.equal(t2.cdEnd, 73222)

        assert.equal(5, t2.exons.length)
        assert.equal(t2.exons[0].utr, true)
        assert.equal(t2.exons[1].cdStart, 66992)
        assert.equal(t2.exons[4].cdEnd, 73222)

    })

    test("GFF query", async function () {

        const chr = "chr1"
        const start = 0
        const end = Number.MAX_SAFE_INTEGER
        const featureSource = FeatureSource({
                url: 'test/data/gff/eden.gff',
                format: 'gff3',
                filterTypes: []
            },
            genome
        )


        const features = await featureSource.getFeatures({chr, start, end})
        assert.ok(features)
        assert.equal(4, features.length)
        assert.equal(chr, features[0].chr) // ensure features chromosome is specified chromosome

    })

    test("Multiline feature", async function () {

        const featureSource = FeatureSource({
                url: 'test/data/gff/multi_line_feature.gff3',
                format: 'gff3'
            },
            genome
        )


        const chr1Features = await featureSource.getFeatures({chr: "chr1", start: 500000, end: 600000})
        assert.ok(chr1Features)
        assert.equal(1, chr1Features.length)
        assert.equal(5, chr1Features[0].exons.length) // ensure features chromosome is specified chromosome

        const chr2Features = await featureSource.getFeatures({chr: "chr2", start: 500000, end: 600000})
        assert.ok(chr2Features)
        assert.equal(1, chr2Features.length)
        assert.equal(5, chr2Features[0].exons.length) // ensure features chromosome is specified chromosome
    })

    /*
    GFF encoded values:
    ["09", "\t"],
    ["%0A", "\n"],
    ["%0D", "\r"],
    ["%25", "%"],
    ["%3B", ";"],
    ["%3D", "="]
    ["%26", "&"],
    ["%2C", ","]])
     */
    test("GFF3 attribute encoding", function () {

        // all allowable characters from GFF3 spec should be decoded;
        // others (here %20 = space) should be left as-is
        const encoded = "aaa%09b%0Acd%0De%25fgh%3Bijk%3Dlm%26nop%2C%20"
        const expected = "aaa\tb\ncd\re%fgh;ijk=lm&nop,%20"

        const decoded = decodeGFFAttribute(encoded)
        assert.equal(expected, decoded)

    })

    test("GFF quotes", function () {

        // Quotes are stripped from GFF2 / GTF attributes, kept for GFF3.  GFF type is determined from the delimiter
        const gff3AttributeString = 'key="value";key2=value'
        let decoded = parseAttributeString(gff3AttributeString, "=")
        assert.equal(decoded.length, 2)
        assert.equal(`"value"`, decoded[0][1])

        const gff2AttributeString = 'key "value";key2 value'
        decoded = parseAttributeString(gff2AttributeString, " ")
        assert.equal(decoded.length, 2)
        assert.equal(`value`, decoded[0][1])

    })
})
