function runBAMTests() {

    igv.sequenceSource = new igv.FastaSequence("//igvdata.broadinstitute.org/genomes/seq/hg19/hg19.fasta");

    //asyncTest("alignments for range", function () {
    //
    //    var chr = "chr22",
    //        beg = 24375199,
    //        end = 24378544,
    //        bamFile;
    //
    //    bamFile = new igv.BamReader({
    //        type: 'bam',
    //        url: 'data/bam/gstt1_sample.bam',
    //        label: 'BAM unit test'});
    //
    //    bamFile.readAlignments(chr, beg, end, function (alignments) {
    //
    //        ok(alignments, "alignments");
    //        equal(alignments.length, 1660, "alignments.length");
    //
    //
    //        start();
    //    }, undefined);
    //});

    /**
    * Look for a known alignment and check expected vs actual block sequence
    *   Read name     = HWI-BRUNOP16X_0001:3:44:7498:170339#0
    *   Read sequence = NNCCACGCGCTGCCGCCATGTGGCCAGCTTGGGTCGGCCTTCGAAGACTTGGCAGCCAGCACCCACGGGATGCAT
    *   Cigar         = 69M204N6M
    *      => block1 sequence = readSeq.substr(0,69)
    *         block2 sequence = readSeq.substr(69)
    *
    */
    //asyncTest("block sequence", 9, function () {
    //
    //    var chr = "chr22",
    //        bpStart = 24375199,
    //        bpEnd = 24378544,
    //        bamPath = "http://www.broadinstitute.org/igvdata/public/test/data/bam/brain_chr22sample.bam",
    //        bamReader = new igv.BamReader({url: bamPath}),
    //        blocks;
    //
    //
    //    bamReader.readAlignments(chr, bpStart, bpEnd, function (alignments) {
    //
    //        var i, len, alignment,
    //            expectedReadSeq = "NNCCACGCGCTGCCGCCATGTGGCCAGCTTGGGTCGGCCTTCGAAGACTTGGCAGCCAGCACCCACGGGATGCAT",
    //            expectedQuals = "!!)))'%(((DDDDDDDDDDDDDDD:DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD:D::6499979;;;",
    //            expectedCigar = "69M204N6M",
    //            blockSeq1 = expectedReadSeq.substr(0, 69),
    //            blockSeq2 = expectedReadSeq.substr(69),
    //            blockQuals1 = expectedQuals.substr(0, 69),
    //            blockQuals2 = expectedQuals.substr(69),
    //            refSeq;
    //
    //        ok(alignments, "alignments");
    //
    //        for (i = 0, len = alignments.length; i < len; i++) {
    //
    //            alignment = alignments[i];
    //
    //            if (alignment.readName === "HWI-BRUNOP16X_0001:3:44:7498:170339#0") {
    //
    //                blocks = alignment.blocks;
    //                equal(alignment.seq, expectedReadSeq);
    //                equal(alignment.cigar, expectedCigar);
    //                equal(blocks.length, 2);
    //                equal(blocks[0].seq, blockSeq1);
    //                equal(blocks[1].seq, blockSeq2);
    //                equal(blocks[0].qual, blockQuals1);
    //                equal(blocks[1].qual, blockQuals2);
    //
    //                equal(alignment.lengthOnRef, 69 + 204 + 6); // From Cigar. Middle 204 is a deletion WRT reference
    //
    //
    //                // Compare refseq to block sequences,  logging mismatches.  This is not really part of the unit
    //                // test, just put here as an example
    //                refSeq = igv.sequenceSource.getSequence(chr, bpStart, bpEnd, function (refSeq) {
    //
    //                    blocks.forEach(function (block) {
    //                        var refOffset = block.start - bpStart,
    //                            blockSeq = block.seq,
    //                            refChar,
    //                            readChar;
    //
    //                        if (blockSeq !== "*") {     // We know its not, this is for completeness
    //
    //                            // Comparison should be case insensitive
    //                            refSeq = refSeq.toUpperCase();
    //                            blockSeq = blockSeq.toUpperCase();
    //                            for (i = 0, len = blockSeq.length; i < len; i++) {
    //
    //                                readChar = blockSeq.charCodeAt(i);
    //                                refChar = refSeq.charCodeAt(refOffset + i);
    //
    //                                if (readChar === "=") {
    //                                    readChar = refChar;   // This is the definition of "=".
    //                                }
    //
    //                                if (readChar === "X" || refChar !== readChar) {
    //                                    console.log("Mistmatch at position " + refOffset + i + "  " + refSeq.charAt(refOffset + i) + " -> " + blockSeq.charAt(i));
    //                                }
    //                            }
    //                        }
    //
    //                    })
    //
    //                });
    //
    //
    //                break;
    //            }
    //        }
    //
    //        start();
    //    });
    //
    //});

    asyncTest("header", function () {

        var bamPath = "data/bam/gstt1_sample.bam",
            bamFile = new igv.BamReader({
                type: 'bam',
                //url: 'http://www.broadinstitute.org/igvdata/1KG/b37/data/NA06984/alignment/NA06984.mapped.ILLUMINA.bwa.CEU.low_coverage.20120522.bam',
                url: bamPath,
                label: 'NA06984'});

        bamFile.readHeader(function () {

            equal(bamFile.contentLength, 60872, "bamFile.contentLength");

            ok(bamFile.chrToIndex["chr1"] === 0);
            start();

        })
    });

    asyncTest("large header", function () {

        var bamPath = "http://www.broadinstitute.org/igvdata/public/test/data/bam/IonXpress_078_rawlib.lgheader.bam",
            bamFile = new igv.BamReader({url: bamPath});

        bamFile.readHeader(function () {

            equal(bamFile.contentLength, 534453);

            ok(!$.isEmptyObject(bamFile.chrToIndex));

            start();
        })
    });


}



