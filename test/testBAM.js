function runBAMTests() {

    // Mock object
    igv.browser = {
        genome: {
            sequence: new igv.FastaSequence("//igvdata.broadinstitute.org/genomes/seq/hg19/hg19.fasta")
        }
    };

    asyncTest("4 alignment bam", function () {

        var chr = "13",
            beg = 32353128,
            end = 32353284,
            bamReader;

        bamReader = new igv.BamReader({
            type: 'bam',
            url: 'data/bam/four.reads.bam',
            label: 'BAM unit test'
        });

        bamReader.readAlignments(chr, beg, end).then(function (alignmentContainer) {
            var alignments = alignmentContainer.alignments;
            ok(alignments, "alignments");
            equal(4, alignments.length, "alignments.length");

            start();
        }).catch(function (error) {
            ok(false, error);  // failed
        });
    });


    asyncTest("alignments for range", function () {

        var chr = "chr22",
            beg = 24375199,
            end = 24378544,
            bamReader;

        bamReader = new igv.BamReader({
            type: 'bam',
            url: 'data/bam/gstt1_sample.bam',
            label: 'BAM unit test'
        });

        bamReader.readAlignments(chr, beg, end).then(function (alignments) {

            ok(alignments, "alignments");
            equal(3345, alignments.length, "alignments.length");

            start();
        }).catch(function (error) {
            ok(false, error);  // failed
        });
    });

    asyncTest("header", function () {

        var bamPath = "data/bam/gstt1_sample.bam",
            bamFile = new igv.BamReader({
                type: 'bam',
                url: bamPath,
                label: 'NA06984'
            });

        bamFile.readHeader().then(function () {

            equal(bamFile.contentLength, 60872, "bamFile.contentLength");

            ok(bamFile.chrToIndex["chr1"] === 0);
            start();

        }).catch(function (error) {
            ok(false, error);  // failed
        })
    });


}



