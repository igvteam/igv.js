import "./utils/mockObjects.js"
import FastaSequence from "../js/genome/fasta.js";
import {decodeDataUri} from "../js/genome/fasta";
import {assert} from 'chai';

suite("testFasta", function () {

    const dataURL = "https://data.broadinstitute.org/igvdata/test/data/";

    test("FastaSequence - Test fasata with no index", async function () {

        this.timeout(100000);

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

        this.timeout(100000);

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

        this.timeout(100000);

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

        this.timeout(100000);

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

    test("data uri", function () {
        const expectedSequence = "CGGGGAGAGAGAGAGAGCGAGCCAGGTTCAGGTCCAGGGAGGAGAGAGACAGCGCGCGCGAGGCGGAGACCTGGAGGGAGAGGAGCTGCGGAGAGGGGTTAGGCGGGGAGGGAGAGAGCCAGGTTCAGGTCCAGGGAGGAGAGAGACAGCGCGCGCGAGGCGGAGACCTGGAGGGAGAGGAGCTGCGGAGAGGGGTTAGGCGGGGAGAGAGAGAGCGAGCCAGGTTCAGGTCCAGGGAGGAGAGAGACAGCGCGCGCGAGGCGGAGACCTGGAGGGAGAGGAGCTGCGGAGAGGGGTTAGGCGGGGAGGGAGAGAGACAGCGCGCGCGAGGCGGAGACCTGGAGGGAGAGGAGCTGCGGAGAGGGGTTAGGCGGCGGGAGGCCCGGGAGCGTTACATGTGTGTGGACTCGGGGAGGGCGGCGGGGGGCCGCTCCTCGGGGCCGTCTGCCTGCAGGAAGGAGTCCACGGACTTGCTGCTGAGGCGGAAGGGCATCAGGCGGCAGAAGGTGCCGGGAGAGTAGGGAATCTGCGTGCGGGCCCTCTGCGAGGGGACCACCGTCTCCCCGGGAGACAGCCAGGGCGGCAGCCTGGCCAGGAGGCTGCGGTCCAGGGCCTCGTCCGGAGAAAACACAGGGTTGTCAATTCCTAGGAGAGAGGGCAGCGGCTAGTCAGCCTTCGGAGAGCCCCACGGCGGCAGGGGAGACCTCGCCGGGGCCGTCACCTGCTGGGTGCCTTGGAAAGTTAGGGTCACCGGGAAGGTTAGGGTCACGTGCCTTTCAGGTTGCGGGCCCTTCCCCCACATCCATGACCCCACACGCCACAGGCAGCACAGGTAACGTCTCGCTTCCCTCAAGACATACCCCACCTGCTCCCTGCCCGGCCCACGTCTCCCCGGACAGCAGCCTCCGAGTTGGTTGAGGGGGCACTCAGTGGGTGCCAAGCAGGGCCCTTGAGAACCCACAGGAGACCCCACCCCcccaggtcccagtgcccctggtccaa";
        const dataUri = "data:application/gzip;base64,H4sIANLFrF8C/71SO07FMBDsuQudn16gQFpN4QvMBSIXoUa5v9iZtRNqJLCVF3u9nl/ex/j8ery3Z2vb9tqej7a9vaDniB8TehC9k/71OmurAWqpmUW4DtAt7tB9zgOBk9V3d/whwb+6+D0KCgeoBXSAYK+ZILyoZrdWyZNG6ig3FLQe8ZhLNuHrNC+XLAOFoxBeuKLbUyctOIzYLVjaamvhIWRTYom2eyyJYSlVEItBZuzWTFQMORAup8hUFJSn68sUlABkx6ic+Yk5sOj6ShtloxJx/BJid1SWadWx12mvNO7KbKy/yW3dPiVUHigi70Rm9ZLmBSMql16XZEnZcF6xHvgl9vJw5egQ7RJKWoLJilz4UrXMRPSZJtwSgakllrwcY4z9OE6/ziNf4/R2378BIJQ+9/4DAAA=";
        const fasta = decodeDataUri(dataUri);
        const lines = fasta.split('\n');
        assert.equal(lines[1], expectedSequence);
    })

})