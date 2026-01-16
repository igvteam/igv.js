import "./utils/mockObjects.js"
import FeatureSource from "../js/feature/featureSource.js"
import FeatureFileReader from "../js/feature/featureFileReader.js"
import {assert} from 'chai'
import {createGenome} from "./utils/MockGenome.js"

const genome = createGenome()
import GFFHelper from "../js/feature/gff/gffHelper.js"
import {decodeGFFAttribute, parseAttributeString} from "../js/feature/gff/parseAttributeString.js"

suite("testGFF", function () {

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

    test("Eden GFF", async function () {

        const chr = "chr1"
        const start = 1
        const end = 10000
        const featureReader = new FeatureFileReader({
                url: 'test/data/gff/eden.gff',
                format: 'gff3',
                filterTypes: [],
                assembleGFF: false
            },
            genome
        )


        // Fetch "raw" features (constituitive parts)
        const features = await featureReader.readFeatures(chr, start, end)
        assert.ok(features)
        assert.equal(20, features.length)

        // Combine features
        const helper = new GFFHelper({format: "gff3"})
        const combinedFeatures = combineFeatures(features, helper)
        assert.equal(4, combinedFeatures.length)

        // Check last transcript
        /*
mRNA	1300	9000	.	+	.	 ID=mRNA00003;Parent=gene00001;Name=EDEN.3
exon	1300	1500	.	+	.	 ID=exon00001;Parent=mRNA00003
exon	3000	3902	.	+	.	 ID=exon00003;Parent=mRNA00001,mRNA00003
exon	5000	5500	.	+	.	 ID=exon00004;Parent=mRNA00001,mRNA00002,mRNA00003
exon	7000	9000	.	+	.	 ID=exon00005;Parent=mRNA00001,mRNA00002,mRNA00003
CDS	    3301	3902	.	+	0	ID=cds00003;Parent=mRNA00003;Name=edenprotein.3
CDS	    5000	5500	.	+	1	ID=cds00003;Parent=mRNA00003;Name=edenprotein.3
CDS	    7000	7600	.	+	1	ID=cds00003;Parent=mRNA00003;Name=edenprotein.3
         */
        const mRNA3 = combinedFeatures[3]
        assert.equal(mRNA3.name, "EDEN.3")
        assert.equal(mRNA3.exons.length, 4)
        assert.equal(mRNA3.exons[0].utr, true)
        assert.equal(mRNA3.exons[1].cdStart, 3300)
        assert.equal(mRNA3.exons[3].cdEnd, 7600)
    })

    test("ENSEMBL GFF transcript", async function () {

        const featureReader = new FeatureFileReader({
                url: 'test/data/gff/Ensembl_MYC-205.gff3',
                format: 'gff3',
                filterTypes: [],
                assembleGFF: false
            },
            genome
        )


        // Fetch "raw" features (constituitive parts)
        const features = await featureReader.readFeatures()
        assert.ok(features)
        assert.equal(9, features.length)

        // Combine features
        const helper = new GFFHelper({format: "gff3"})
        const combinedFeatures = combineFeatures(features, helper)
        assert.equal(1, combinedFeatures.length)
        assert.equal(3, combinedFeatures[0].exons.length)
    })

    test("ENSEMBL GFF region", async function () {

        const featureReader = new FeatureFileReader({
                url: 'test/data/gff/Ensembl_MYC-region.gff3',
                format: 'gff3',
                filterTypes: [],
                assembleGFF: false
            },
            genome
        )


        // Fetch "raw" features (constituitive parts)
        const features = await featureReader.readFeatures()
        assert.ok(features)
        assert.equal(76, features.length)

        // Combine features
        const helper = new GFFHelper({format: "gff3"})
        const combinedFeatures = combineFeatures(features, helper)

        // 9 mRNAs, 11 biological regions
        assert.equal(20, combinedFeatures.length)
        assert.equal(9, combinedFeatures.filter(f => f.type === "mRNA").length)

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
