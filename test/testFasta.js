import "./utils/mockObjects.js"
import {loadFasta} from "../js/genome/fasta.js"
import {assert} from 'chai'

suite("testFasta", function () {

    //const dataURL = "https://data.broadinstitute.org/igvdata/test/data/"

    // test("FastaSequence - Test fasata with no index", async function () {
    //
    //     this.timeout(100000)
    //
    //     const fasta = await loadFasta(
    //         {
    //             fastaURL: dataURL + "fasta/test.fasta",
    //             indexed: false
    //         }
    //     )
    //
    //     // Note -- coordinates are UCSC style
    //     // chr22:29565177-29565216
    //     const expectedSequence = "GCTGC"
    //     const seq = await fasta.getSequence("CACNG6--RPLP2", 60, 65)
    //     assert.equal(seq, expectedSequence)
    //
    // })

    test("FastaSequence - Test getSequence", async function () {

        this.timeout(100000)

        const fasta = await loadFasta({
                fastaURL: "https://www.dropbox.com/s/bpf7g2ynx8qep73/chr22.fa?dl=0",
                indexURL: "https://www.dropbox.com/s/1jx9327vjkd87w5/chr22.fa.fai?dl=0"
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


    // test("FastaSequence - Test getSequence block compressed", async function () {
    //
    //     this.timeout(100000)
    //     const fasta = await loadFasta({
    //             fastaURL: dataURL + "fasta/chr22.fa.gz",
    //             indexURL: dataURL + "fasta/chr22.fa.gz.fai",
    //             compressedIndexURL: dataURL + "fasta/chr22.fa.gz.gzi"
    //         }
    //     )
    //
    //     // Note -- coordinates are UCSC style
    //     // chr22:29565177-29565216
    //     const sequence = await fasta.getSequence("chr22", 29565176, 29565216)
    //     const expectedSeqString = "CTTGTAAATCAACTTGCAATAAAAGCTTTTCTTTTCTCAA",
    //         seqString = sequence.toUpperCase()
    //     assert.equal(seqString, expectedSeqString)
    //
    // })


    /**
     * Test "old" syntax partial fasta (pre multi-locus support)
     */
    test("FastaSequence - Test partial fasta", async function () {
        // >chr1:1000001-1000025
        // GGGCACAGCCTCACCCAGGAAAGCA

        const fasta = await loadFasta({
            fastaURL: "test/data/fasta/sliced.fasta", indexed: false
        })

        let expected = "GGGCACAGCCTCACCCAGGAAAGCA"
        let seq = await fasta.getSequence("chr1", 1000000, 1000025)
        assert.equal(seq, expected)


        // Off left side
        expected = "*****GGGCA"
        seq = await fasta.getSequence("chr1", 999995, 1000005)
        assert.equal(seq, expected)

        // way....   Off left side
        expected = undefined

        seq = await fasta.getSequence("chr1", 10, 20)
        assert.equal(seq, expected)

        // No length token
        const chr1 = fasta.chromosomes.get("chr1")
        assert.equal(chr1.bpLength, 1000025)

    })


    /**
     * Test multi-locus sliced fasta wiht 2 sequences on chr1
     */
    test("FastaSequence - Test mutli-slice partial fasta", async function () {

        // >chr1:2000001-2000025 @len=249250621
        // TTTGCTGAGGATTGGGCTTGGGTAC
        // >chr3:2000001-2000025 @len=198022430
        // TTTGCTGAGGATTGGGCTTGGGTAC
        // >chr1:1000001-1000025 @len=249250621
        // GGGCACAGCCTCACCCAGGAAAGCA

        const fasta = await loadFasta({
            fastaURL: "test/data/fasta/sliced2.fasta", indexed: false
        })

        let expected = "GGGCACAGCCTCACCCAGGAAAGCA"
        let seq = await fasta.getSequence("chr1", 1000000, 1000025)
        assert.equal(seq, expected)


        // Off left side
        expected = "*****GGGCA"
        seq = await fasta.getSequence("chr1", 999995, 1000005)
        assert.equal(seq, expected)

        // way....   Off left side
        expected = undefined

        seq = await fasta.getSequence("chr1", 10, 20)
        assert.equal(seq, expected)

        expected = "TTTGCTGAGGATTGGGCTTGGGTAC"
        seq = await fasta.getSequence("chr1", 2000000, 2000025)
        assert.equal(seq, expected)


        // Off left side
        expected = "*****TTTGC"
        seq = await fasta.getSequence("chr1", 1999995, 2000005)
        assert.equal(seq, expected)

        const chr1 = fasta.chromosomes.get("chr1")
        assert.equal(chr1.bpLength, 249250621)


    })

    test("Fasta -- data uri, partial fasta", async function () {

        //>chr5:474488-475489
        const expectedSequence = "CGGGGAGAGAGAGAGAGCGAGCCAGGTTCAGGTCCAGGGAGGAGAGAGACAGCGCGCGCGAGGCGGAGACCTGGAGGGAGAGGAGCTGCGGAGAGGGGTTAGGCGGGGAGGGAGAGAGCCAGGTTCAGGTCCAGGGAGGAGAGAGACAGCGCGCGCGAGGCGGAGACCTGGAGGGAGAGGAGCTGCGGAGAGGGGTTAGGCGGGGAGAGAGAGAGCGAGCCAGGTTCAGGTCCAGGGAGGAGAGAGACAGCGCGCGCGAGGCGGAGACCTGGAGGGAGAGGAGCTGCGGAGAGGGGTTAGGCGGGGAGGGAGAGAGACAGCGCGCGCGAGGCGGAGACCTGGAGGGAGAGGAGCTGCGGAGAGGGGTTAGGCGGCGGGAGGCCCGGGAGCGTTACATGTGTGTGGACTCGGGGAGGGCGGCGGGGGGCCGCTCCTCGGGGCCGTCTGCCTGCAGGAAGGAGTCCACGGACTTGCTGCTGAGGCGGAAGGGCATCAGGCGGCAGAAGGTGCCGGGAGAGTAGGGAATCTGCGTGCGGGCCCTCTGCGAGGGGACCACCGTCTCCCCGGGAGACAGCCAGGGCGGCAGCCTGGCCAGGAGGCTGCGGTCCAGGGCCTCGTCCGGAGAAAACACAGGGTTGTCAATTCCTAGGAGAGAGGGCAGCGGCTAGTCAGCCTTCGGAGAGCCCCACGGCGGCAGGGGAGACCTCGCCGGGGCCGTCACCTGCTGGGTGCCTTGGAAAGTTAGGGTCACCGGGAAGGTTAGGGTCACGTGCCTTTCAGGTTGCGGGCCCTTCCCCCACATCCATGACCCCACACGCCACAGGCAGCACAGGTAACGTCTCGCTTCCCTCAAGACATACCCCACCTGCTCCCTGCCCGGCCCACGTCTCCCCGGACAGCAGCCTCCGAGTTGGTTGAGGGGGCACTCAGTGGGTGCCAAGCAGGGCCCTTGAGAACCCACAGGAGACCCCACCCCcccaggtcccagtgcccctggtccaa"
        const dataUri = "data:application/gzip;base64,H4sIANLFrF8C/71SO07FMBDsuQudn16gQFpN4QvMBSIXoUa5v9iZtRNqJLCVF3u9nl/ex/j8ery3Z2vb9tqej7a9vaDniB8TehC9k/71OmurAWqpmUW4DtAt7tB9zgOBk9V3d/whwb+6+D0KCgeoBXSAYK+ZILyoZrdWyZNG6ig3FLQe8ZhLNuHrNC+XLAOFoxBeuKLbUyctOIzYLVjaamvhIWRTYom2eyyJYSlVEItBZuzWTFQMORAup8hUFJSn68sUlABkx6ic+Yk5sOj6ShtloxJx/BJid1SWadWx12mvNO7KbKy/yW3dPiVUHigi70Rm9ZLmBSMql16XZEnZcF6xHvgl9vJw5egQ7RJKWoLJilz4UrXMRPSZJtwSgakllrwcY4z9OE6/ziNf4/R2378BIJQ+9/4DAAA="

        const fasta = await loadFasta({
            fastaURL: dataUri
        })

        const seq = await fasta.getSequence("chr5", 474487, 475489)
        assert.equal(seq, expectedSequence)

    })

})