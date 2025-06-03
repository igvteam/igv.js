import "./utils/mockObjects.js"
import {assert} from 'chai'
import FastaSequence from "../src/igvCore/genome/indexedFasta.js"
import NonIndexedFasta from "../src/igvCore/genome/nonIndexedFasta.js"

suite("testFasta", function () {

    test("FastaSequence - Test getSequence", async function () {

        this.timeout(100000)

        const fasta = new FastaSequence({
                fastaURL: "https://igv-genepattern-org.s3.amazonaws.com/test/fasta/chr22.fa",
                indexURL: "https://igv-genepattern-org.s3.amazonaws.com/test/fasta/chr22.fa.fai?"
            }
        )
        await fasta.init()

        // Note -- coordinates are UCSC style
        // chr22:29565177-29565216
        const sequence = await fasta.readSequence("chr22", 29565176, 29565216)
        const expectedSeqString = "CTTGTAAATCAACTTGCAATAAAAGCTTTTCTTTTCTCAA"
        const seqString = sequence.toUpperCase()
        assert.equal(seqString, expectedSeqString)

        const noSSequence = await fasta.readSequence("noSuchChr", 0, 10)
        assert.equal(null, noSSequence)

    })

    test("FastaSequence - Non-indexed fasta", async function () {

        const expectedSeqString = "tgactgcaacgggcaatatgtctctgtgtggattaaaaaaagagtgtctgatagcagcttctgaactggt"

        const fasta = new NonIndexedFasta({
                fastaURL: "test/data/fasta/ecoli_out.padded.fasta"
            }
        )
        await fasta.init()
        const sequence = await fasta.getSequence("NC_000913_bb", 30, 100)
        assert.equal(sequence, expectedSeqString)
    })

    /**
     * Test "old" syntax partial fasta (pre multi-locus support)
     */
    test("FastaSequence - Test partial fasta", async function () {
        // >chr1:1000001-1000025
        // GGGCACAGCCTCACCCAGGAAAGCA

        const fasta = new NonIndexedFasta({
            fastaURL: "test/data/fasta/sliced.fasta"
        })
        await fasta.init()

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

        // length token
        const chr1 = fasta.chromosomes.get("chr1")
        assert.equal(chr1.bpLength, 249250621)

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

        const fasta = new NonIndexedFasta({
            fastaURL: "test/data/fasta/sliced2.fasta"
        })
        await fasta.init

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


})
