import FastaSequence from "../js/genome/fasta.js";
import {assert} from 'chai';
import {setup} from "./util/setup.js";

suite("testFasta", function () {

    setup('remote');

    const dataURL = "https://data.broadinstitute.org/igvdata/test/data/";

    test("FastaSequence - Test fasata with no index", async function () {

        const fasta = new FastaSequence(
            {
                fastaURL: dataURL + "fasta/test.fasta",
                indexed: false
            }
        );

        await fasta.init()

        // Note -- coordinates are UCSC style
        // chr22:29565177-29565216
        const expectedSequence = "GCTGC";
        const seq = await fasta.getSequence("CACNG6--RPLP2", 60, 65);
        assert.equal(seq, expectedSequence);

    })

    test("FastaSequence - Test getSequence", async function () {

        const fasta = new FastaSequence({fastaURL: dataURL + "fasta/chr22.fa"});
        await fasta.init();

        // Note -- coordinates are UCSC style
        // chr22:29565177-29565216
        const sequence = await fasta.getSequence("chr22", 29565176, 29565216);
        const expectedSeqString = "CTTGTAAATCAACTTGCAATAAAAGCTTTTCTTTTCTCAA",
            seqString = sequence.toUpperCase();
        assert.equal(seqString, expectedSeqString);

    })

    test("FastaSequence - Test readSequence", async function () {

        const fasta = new FastaSequence({fastaURL: dataURL + "fasta/chr22.fa"});
        await fasta.init()

        // Note -- coordinates are UCSC style
        // chr22:29565177-29565216
        const expectedSeqString = "CTTGTAAATCAACTTGCAATAAAAGCTTTTCTTTTCTCAA";
        const sequence = await fasta.getSequence("chr22", 29565176, 29565216);
        const seqString = sequence.toUpperCase();
        assert.equal(seqString, expectedSeqString);

    })

    test("FastaSequence - Test readSequence - with unknown sequence", async function () {

        const fasta = new FastaSequence({fastaURL: dataURL + "fasta/chr22.fa"});
        await fasta.init();

        // Note -- coordinates are UCSC style
        // chr22:29565177-29565216
        const nullSeq = await fasta.getSequence("noSuchChromosome", 29565176, 29565216);
        assert.ok(!nullSeq);
    })


    // >chr1:1000001-1000025
    // GGGCACAGCCTCACCCAGGAAAGCA

    test("FastaSequence - Test fasta with start offset", async function () {

        setup('local');

        const fasta = new FastaSequence({fastaURL: require.resolve("./data/fasta/sliced.fasta"), indexed: false});
        await fasta.init();

        let expected = "GGGCACAGCCTCACCCAGGAAAGCA";
        let seq = await fasta.getSequence("chr1", 1000000, 1000025);
        assert.equal(seq, expected);


        // Off left side
        expected = "*****GGGCA";
        seq = await fasta.getSequence("chr1", 999995, 1000005);
        assert.equal(seq, expected);

        // way....   Off left side
        expected = "**********";

        seq = await fasta.getSequence("chr1", 10, 20);
        assert.equal(seq, expected);

    })
})