import BGZLineReader from "../src/igvCore/util/bgzLineReader.js"
import "./utils/mockObjects.js"
import {assert} from 'chai'

suite("testBGZipLineReader", function () {

    test("long lines ", async function () {

        // Test of a line spanning multiple bgzip blocks
        const config = {
            url: "test/data/gcnv/gcnv_large.bed.gz"
        }


        const reader = new BGZLineReader(config)
        const headerLine = await reader.nextLine()
        const columnCount = headerLine.split("\t").length

        assert.equal(44292, headerLine.length)
        assert.ok(headerLine.endsWith("xx-1915xxxxxxx1xx03xx1xxxxxexxxx"))

        let lineCount = 0
        let line
        while ((line = await reader.nextLine())) {
            const tokens = line.split("\t")
            assert.equal(tokens.length, columnCount)
            lineCount++
        }
        assert.equal(lineCount, 2)

    })

    test("1kg VCF", async function () {

        this.timeout(10000)

        const config = {
            url: 'https://s3.amazonaws.com/1000genomes/release/20130502/ALL.wgs.phase3_shapeit2_mvncall_integrated_v5b.20130502.sites.vcf.gz',
            bgzip: true
        }

        const reader = new BGZLineReader(config)
        const headerLine = await reader.nextLine()

        let lineCount = 0
        let line
        while ((line = await reader.nextLine()) && lineCount < 2000) {
            lineCount++
        }
        assert.equal(lineCount, 2000)

    })

})

