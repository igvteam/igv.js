function runBAMTests() {

    if (!igv) igv = {};
    igv.sequenceSource = new igv.FastaSequence("//igvdata.broadinstitute.org/genomes/seq/hg19/hg19.fasta");

    asyncTest("reference sequence", 1, function () {

        var chr = "chr22",
            bpStart = 24375199,
            bpEnd = /*24378544*/ 4 + bpStart;

        igv.sequenceSource.getSequence(chr, bpStart, bpEnd, function (refSeq) {

            ok(refSeq, "reference sequence");
            console.log("reference sequence " + refSeq + " length " + refSeq.length);

            start();


        });

    });

//    asyncTest("BamSource - Test getFeatures method", 3, function () {
//
//        var i,
//            j,
//            total,
//            alignmentRow,
//            chr = "chr1",
//            ss = 155169174,
//            ee = 155169329,
//            bamPath = "http://www.broadinstitute.org/igvdata/1KG/b37/data/NA06984/alignment/NA06984.mapped.ILLUMINA.bwa.CEU.low_coverage.20120522.bam",
//            bamSource = new igv.BamSource(bamPath, null);
//
//        bamSource.getFeatures(chr, ss, ee, function (alignmentMananger) {
//
//            ok(alignmentMananger, "alignmentMananger");
//            ok(alignmentMananger.genomicInterval, "alignmentMananger.genomicInterval");
//            ok(alignmentMananger.genomicInterval.features, "alignmentMananger.genomicInterval.features");
//
//            equal(alignmentMananger.genomicInterval.features.length, alignmentMananger.reservoirSampleCount, "alignmentManager.genomicInterval.features.length");
//
//            var total = 0;
//            for (i = 0; i < alignmentMananger.genomicInterval.packedAlignments.length; i++) {
//                alignmentRow = alignmentMananger.genomicInterval.packedAlignments[i];
//                for (j = 0; j < alignmentRow.length; j++) {
//                    ++total;
//                }
//            }
//
//            equal(total, alignmentMananger.reservoirSampleCount, "total");
//
//            start();
//
//        })
//    });

//    asyncTest("Read index", 1, function () {
//
//        var bamPath = "../test/data/gstt1_sample.bam",
//            bamFile = new igv.BamReader(bamPath, null);
//
//        bamFile.readIndex(function () {
//
//            equal(15, bamFile.indices.length, "bamFile.indices.length");
//
//            var index = bamFile.indices[14];
//            console.log("index-14 " + index);
//            start();
//        })
//
//    });
//
//    asyncTest("Read header", 1, function () {
//
//        var bamPath = "../test/data/gstt1_sample.bam",
//            bamFile = new igv.BamReader(bamPath, null);
//
//        bamFile.readHeader(function () {
//
//            equal(bamFile.contentLength, 60872, "bamFile.contentLength");
//
//            start();
//        })
//    });
//
//    asyncTest("blocksForRange", 4, function () {
//
//        var refID = 14,
//            beg = 24375199,
//            end = 24378544,
//            bamPath = "../test/data/gstt1_sample.bam",
//            bamFile = new igv.BamReader(bamPath, null);
//
//        bamFile.blocksForRange(refID, beg, end, function (chunks) {
//
//            ok(chunks, "chunks are non-null");
//            equal(chunks.length, 1, "chunks.length is correct");
//
//            var chunk = chunks[0];
//            equal(0, chunk.maxv.offset, "chunk.maxv.offset");
//            equal(60872, chunk.maxv.block, "chunk.maxv.block");
//
//            start();
//        })
//    });
//
//    asyncTest("alignments for range", 2, function () {
//
//        var chr = "chr22",
//            beg = 24375199,
//            end = 24378544,
//            bamPath = "../test/data/gstt1_sample.bam",
//            bamFile = new igv.BamReader(bamPath, null);
//
//        bamFile.readAlignments(chr, beg, end, function (alignments) {
//
//            ok(alignments, "alignments");
//            equal(alignments.length, 1660, "alignments.length");
//
//
//            start();
//        })
//    });
//
//    /**
//     * Look for a known alignment and check expected vs actual block sequence
//     *   Read name     = HWI-BRUNOP16X_0001:3:44:7498:170339#0
//     *   Read sequence = NNCCACGCGCTGCCGCCATGTGGCCAGCTTGGGTCGGCCTTCGAAGACTTGGCAGCCAGCACCCACGGGATGCAT
//     *   Cigar         = 69M204N6M
//     *      => block1 sequence = readSeq.substr(0,69)
//     *         block2 sequence = readSeq.substr(69)
//     *
//     */
//    asyncTest("block sequence", 9, function () {
//
//        var chr = "chr22",
//            bpStart = 24375199,
//            bpEnd = 24378544,
//            bamPath = "../test/data/brain_chr22sample.bam",
//            bamReader = new igv.BamReader(bamPath, null),
//            blocks;
//
//
//        bamReader.readAlignments(chr, bpStart, bpEnd, function (alignments) {
//
//            var i, len, alignment,
//                expectedReadSeq = "NNCCACGCGCTGCCGCCATGTGGCCAGCTTGGGTCGGCCTTCGAAGACTTGGCAGCCAGCACCCACGGGATGCAT",
//                expectedQuals = "!!)))'%(((DDDDDDDDDDDDDDD:DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD:D::6499979;;;",
//                expectedCigar = "69M204N6M",
//                blockSeq1 = expectedReadSeq.substr(0, 69),
//                blockSeq2 = expectedReadSeq.substr(69),
//                blockQuals1 = expectedQuals.substr(0, 69),
//                blockQuals2 = expectedQuals.substr(69),
//                refSeq;
//
//            ok(alignments, "alignments");
//
//            for (i = 0, len = alignments.length; i < len; i++) {
//
//                alignment = alignments[i];
//
//                if (alignment.readName === "HWI-BRUNOP16X_0001:3:44:7498:170339#0") {
//
//                    blocks = alignment.blocks;
//                    equal(alignment.seq, expectedReadSeq);
//                    equal(alignment.cigar, expectedCigar);
//                    equal(blocks.length, 2);
//                    equal(blocks[0].seq, blockSeq1);
//                    equal(blocks[1].seq, blockSeq2);
//                    equal(blocks[0].qual, blockQuals1);
//                    equal(blocks[1].qual, blockQuals2);
//
//                    equal(alignment.lengthOnRef, 69 + 204 + 6); // From Cigar. Middle 204 is a deletion WRT reference
//
//
//                    // Compare refseq to block sequences,  logging mismatches.  This is not really part of the unit
//                    // test, just put here as an example
//                    refSeq = igv.sequenceSource.getSequence(chr, bpStart, bpEnd, function (refSeq) {
//
//                        blocks.forEach(function (block) {
//                            var refOffset = block.start - bpStart,
//                                blockSeq = block.seq,
//                                refChar,
//                                readChar;
//
//                            if (blockSeq !== "*") {     // We know its not, this is for completeness
//
//                                // Comparison should be case insensitive
//                                refSeq = refSeq.toUpperCase();
//                                blockSeq = blockSeq.toUpperCase();
//                                for (i = 0, len = blockSeq.length; i < len; i++) {
//
//                                    readChar = blockSeq.charCodeAt(i);
//                                    refChar = refSeq.charCodeAt(refOffset + i);
//
//                                    if (readChar === "=") {
//                                        readChar = refChar;   // This is the definition of "=".
//                                    }
//
//                                    if (readChar === "X" || refChar !== readChar) {
//                                        console.log("Mistmatch at position " + refOffset + i + "  " + refSeq.charAt(refOffset + i) + " -> " + blockSeq.charAt(i));
//                                    }
//                                }
//                            }
//
//                        })
//
//                    });
//
//
//                    break;
//                }
//            }
//
//            start();
//        });
//
//
//    });


}



