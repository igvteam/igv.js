import "./utils/mockObjects.js"
import {inferFileFormat, inferFileFormatFromContents} from "../src/igvCore/util/fileFormatUtils.js"
import {assert} from 'chai'

suite("testFileFormatUtils", async function () {

    test("Test inferring formats from filename", async function () {

        let config = {url: "foo/test.qtl"}
        let format = await inferFileFormat(config)
        assert.equal(format, 'qtl')

        config = {url: "foo/test.qtl.tsv"}
        format = await inferFileFormat(config)
        assert.equal(format, 'qtl')

        config = {url: "foo/test.qtl.tsv.gz"}
        format = await inferFileFormat(config)
        assert.equal(format, 'qtl')

        config = {url: "foo/test.qtl.tsv.bgz"}
        format = await inferFileFormat(config)
        assert.equal(format, 'qtl')
    })


    test("Test inferring formats from header", async function () {

        // BAM
        let url = 'test/data/bam/na12889.bam'
        let format = await inferFileFormatFromContents({url})
        assert.equal(format, "bam")

        // TODO csi
        let indexURL = 'test/data/bam/na12889.bam.csi'

        // CRAM
        url = 'test/data/cram/na12889.cram'
        format = await inferFileFormatFromContents({url})
        assert.equal(format, "cram")

        // TODO crai
        indexURL = 'test/data/cram/na12889.cram.crai'


        // TDF
        url = "test/data/tdf/gstt1_sample.bam.tdf"
        format = await inferFileFormatFromContents({url})
        assert.equal(format, "tdf")


        // Bigwig
        url = "test/data/bb/fixedStep.bw"
        format = await inferFileFormatFromContents({url})
        assert.equal(format, "bigwig")

        // Bigbed
        url = "test/data/bb/interactExample3.inter.bb"
        format = await inferFileFormatFromContents({url})
        assert.equal(format, "bigbed")

        // VCF
        url = "test/data/vcf/example.vcf"
        format = await inferFileFormatFromContents({url})
        assert.equal(format, "vcf")

        // GFF
        url = "test/data/gff/eden.gff"
        format = await inferFileFormatFromContents({url})
        assert.equal(format, "gff3")

        // QTL
        url = "test/data/qtl/B.cell_eQTL.tsv"
        format = await inferFileFormatFromContents({url})
        assert.equal(format, "qtl")

        // gzipped text file
        url = "test/data/qtl/B.cell_eQTL.tsv.gz"
        format = await inferFileFormatFromContents({url})
        assert.equal(format, "qtl")

        // bgzipped text file
        url = "test/data/qtl/B.cell_eQTL.tsv.bgz"
        format = await inferFileFormatFromContents({url})
        assert.equal(format, "qtl")

    })


})

