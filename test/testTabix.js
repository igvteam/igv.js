import "./utils/mockObjects.js"
import {loadIndex} from "../js/bam/indexFactory.js"
import FeatureFileReader from "../js/feature/featureFileReader.js"
import {assert} from 'chai'

suite("testTabix", function () {

    test("TBI index", async function () {

        const refID = 26,
            beg = 55369194,
            end = 55369443,
            indexPath = "test/data/tabix/refGene.hg19.bed.gz.tbi"
        const config = {}

        const tbiIndex = await loadIndex(indexPath, config)
        assert.ok(tbiIndex)

        const blocks = tbiIndex.chunksForRange(refID, beg, end)
        assert.equal(blocks.length, 1)
        assert.equal(1640062, blocks[0].minv.block)

    })


    test("CSI index", async function () {

        const refID = 0,
            beg = 1226000,
            end = 1227000,
            indexPath = "test/data/tabix/csi-test.vcf.gz.csi"

        const config = {}

        const csiIndex = await loadIndex(indexPath, config)
        assert.ok(csiIndex)

        const blocks = csiIndex.chunksForRange(refID, beg, end)
        assert.ok(blocks.length > 0)

    })

    test("CSI query - vcf", async function () {

        const chr = "chr1",
            beg = 1226000,
            end = 1227000

        const reader = new FeatureFileReader({
            format: "vcf",
            url: "test/data/tabix/csi-test.vcf.gz",
            indexURL: "test/data/tabix/csi-test.vcf.gz.csi"
        })

        await reader.readHeader()
        const features = await reader.readFeatures(chr, beg, end)
        assert.ok(features)

        // Verify features are in query range.  The features immediately before and after query range are returned by design
        const len = features.length
        assert.ok(len > 0)
        for (let i = 1; i < len - 1; i++) {
            const f = features[i]
            assert.ok(f.chr === chr && f.end >= beg && f.start <= end)
        }
    })

    test("CSI query - gff", async function () {

        this.timeout(200000)

        const chr = "10",
            beg = 400000,
            end = 500000

        const reader = new FeatureFileReader({
            format: "gff3",
            url: "https://s3.amazonaws.com/igv.org.genomes/hg38/Homo_sapiens.GRCh38.94.chr.gff3.gz",
            indexURL: "https://s3.amazonaws.com/igv.org.genomes/hg38/Homo_sapiens.GRCh38.94.chr.gff3.gz.csi"
        })
        await reader.readHeader()
        const features = await reader.readFeatures(chr, beg, end)
        assert.ok(features)

        const len = features.length
        assert.ok(len > 0)
        for (let i = 1; i < len - 1; i++) {
            const f = features[i]
            assert.equal(f.chr , chr)
        }
    })
})



