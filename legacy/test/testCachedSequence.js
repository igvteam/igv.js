import "./utils/mockObjects.js"
import {loadSequence} from "../js/genome/loadSequence.js"
import {assert} from 'chai'

suite("testCachedSequence", function () {


    test("Cached Sequence -  getSequence", async function () {

        this.timeout(100000)

        const fasta = await loadSequence({
                "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg19/bigZips/hg19.2bit"
            }
        )

        // Note -- coordinates are UCSC style
        // chr22:29565177-29565216
        const sequence = await fasta.getSequence("chr22", 29565176, 29565216)
        const expectedSeqString = "CTTGTAAATCAACTTGCAATAAAAGCTTTTCTTTTCTCAA"
        const seqString = sequence.toUpperCase()
        assert.equal(seqString, expectedSeqString)


        const noSSequence = await fasta.getSequence("noSuchChr", 0, 10)
        assert.equal(null, noSSequence)

    })

    test("Cached Sequence -  getSequenceInterval", async function () {

        this.timeout(100000)

        const fasta = await loadSequence({
                "twoBitURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg19/bigZips/hg19.2bit"
            }
        )
        // Note -- coordinates are UCSC style
        // chr22:29565177-29565216
        const start = 29565176
        const end = 29565216

        // Preload the cache
        await fasta.getSequence("chr22", start, end)

        const interval = fasta.getSequenceInterval("chr22", start, end)
        const sequence = interval.getSequence(start, end)


        const expectedSeqString = "CTTGTAAATCAACTTGCAATAAAAGCTTTTCTTTTCTCAA"
        const seqString = sequence.toUpperCase()
        assert.equal(seqString, expectedSeqString)
    })


})