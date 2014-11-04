function runBAMTests() {

    if (!igv) igv = {};
    igv.sequenceSource = new igv.FastaSequence("//igvdata.broadinstitute.org/genomes/seq/hg19/hg19.fasta");


    asyncTest("Read index", function () {

        var bamPath = "../test/data/bam/gstt1_sample.bam",
            bamFile = new igv.BamReader(bamPath, null);

        bamFile.readIndex(function () {

            equal(15, bamFile.indices.length, "bamFile.indices.length");

            var index = bamFile.indices[14];
            console.log("index-14 " + index);
            start();
        })

    });

    asyncTest("Read header", function () {

        var bamPath = "../test/data/bam/gstt1_sample.bam",
            bamFile = new igv.BamReader(bamPath, null);

        bamFile.readHeader(function () {

            equal(bamFile.contentLength, 60872, "bamFile.contentLength");

            start();
        })
    });

    asyncTest("blocksForRange", 4, function () {

        var refID = 14,
            beg = 24375199,
            end = 24378544,
            bamPath = "../test/data/bam/gstt1_sample.bam",
            bamFile = new igv.BamReader(bamPath, null);

        bamFile.blocksForRange(refID, beg, end, function (chunks) {

            ok(chunks, "chunks are non-null");
            equal(chunks.length, 1, "chunks.length is correct");

            var chunk = chunks[0];
            equal(0, chunk.maxv.offset, "chunk.maxv.offset");
            equal(60872, chunk.maxv.block, "chunk.maxv.block");

            start();
        })
    });

    asyncTest("alignments for range", function () {

        var chr = "chr22",
            beg = 24375199,
            end = 24378544,
            bamPath = "../test/data/bam/gstt1_sample.bam",
            bamFile = new igv.BamReader(bamPath, null);

        bamFile.readAlignments(chr, beg, end, function (alignments) {

            ok(alignments, "alignments");
            equal(alignments.length, 1660, "alignments.length");


            start();
        })
    });

    /**
     * Look for a known alignment and check expected vs actual block sequence
     *   Read name     = HWI-BRUNOP16X_0001:3:44:7498:170339#0
     *   Read sequence = NNCCACGCGCTGCCGCCATGTGGCCAGCTTGGGTCGGCCTTCGAAGACTTGGCAGCCAGCACCCACGGGATGCAT
     *   Cigar         = 69M204N6M
     *      => block1 sequence = readSeq.substr(0,69)
     *         block2 sequence = readSeq.substr(69)
     *
     */
    asyncTest("block sequence", 9, function () {

        var chr = "chr22",
            bpStart = 24375199,
            bpEnd = 24378544,
            bamPath = "../test/data/bam/brain_chr22sample.bam",
            bamReader = new igv.BamReader(bamPath, null),
            blocks;


        bamReader.readAlignments(chr, bpStart, bpEnd, function (alignments) {

            var i, len, alignment,
                expectedReadSeq = "NNCCACGCGCTGCCGCCATGTGGCCAGCTTGGGTCGGCCTTCGAAGACTTGGCAGCCAGCACCCACGGGATGCAT",
                expectedQuals = "!!)))'%(((DDDDDDDDDDDDDDD:DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD:D::6499979;;;",
                expectedCigar = "69M204N6M",
                blockSeq1 = expectedReadSeq.substr(0, 69),
                blockSeq2 = expectedReadSeq.substr(69),
                blockQuals1 = expectedQuals.substr(0, 69),
                blockQuals2 = expectedQuals.substr(69),
                refSeq;

            ok(alignments, "alignments");

            for (i = 0, len = alignments.length; i < len; i++) {

                alignment = alignments[i];

                if (alignment.readName === "HWI-BRUNOP16X_0001:3:44:7498:170339#0") {

                    blocks = alignment.blocks;
                    equal(alignment.seq, expectedReadSeq);
                    equal(alignment.cigar, expectedCigar);
                    equal(blocks.length, 2);
                    equal(blocks[0].seq, blockSeq1);
                    equal(blocks[1].seq, blockSeq2);
                    equal(blocks[0].qual, blockQuals1);
                    equal(blocks[1].qual, blockQuals2);

                    equal(alignment.lengthOnRef, 69 + 204 + 6); // From Cigar. Middle 204 is a deletion WRT reference


                    // Compare refseq to block sequences,  logging mismatches.  This is not really part of the unit
                    // test, just put here as an example
                    refSeq = igv.sequenceSource.getSequence(chr, bpStart, bpEnd, function (refSeq) {

                        blocks.forEach(function (block) {
                            var refOffset = block.start - bpStart,
                                blockSeq = block.seq,
                                refChar,
                                readChar;

                            if (blockSeq !== "*") {     // We know its not, this is for completeness

                                // Comparison should be case insensitive
                                refSeq = refSeq.toUpperCase();
                                blockSeq = blockSeq.toUpperCase();
                                for (i = 0, len = blockSeq.length; i < len; i++) {

                                    readChar = blockSeq.charCodeAt(i);
                                    refChar = refSeq.charCodeAt(refOffset + i);

                                    if (readChar === "=") {
                                        readChar = refChar;   // This is the definition of "=".
                                    }

                                    if (readChar === "X" || refChar !== readChar) {
                                        console.log("Mistmatch at position " + refOffset + i + "  " + refSeq.charAt(refOffset + i) + " -> " + blockSeq.charAt(i));
                                    }
                                }
                            }

                        })

                    });


                    break;
                }
            }

            start();
        });

    });

    asyncTest("bam source", function () {

        // this returns 1660 alignments

        var chr = "chr22",
            beg = 24371000;
            end = 24383000;
            bamPath = "../test/data/bam/gstt1_sample.bam",
            bamFile = new igv.BamReader(bamPath, null);

        bamFile.readAlignments(chr, beg, end, function (alignments) {

            equal(alignments.length, 1660)
            start();
        });

    });


}



