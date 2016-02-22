/**
 * Created by turner on 3/13/14.
 */
function runAlignmentCoverageTests() {

    asyncTest("FastaSequence - test getSequence method", function () {

        var chr = "chr22",
            ss = 29565176,
            ee = 29565216,
            sequenceSource = new igv.FastaSequence("http://dn7ywbm9isq8j.cloudfront.net/genomes/seq/hg19/hg19.fasta");

        ok(sequenceSource);

        sequenceSource.getSequence("chr22", ss, ee).then(function (sequence) {

            ok(sequence, "sequence");
            equal(sequence.length, (ee - ss));

            start();

        }, undefined).catch(function (error) {
            console.log(error);
        });

    });

    asyncTest("AlignmentController - test BAM feature source get features", function () {

        var bamSource;

        // Mock object
        igv.browser = {
            genome: {
                sequence: new igv.FastaSequence("//igvdata.broadinstitute.org/genomes/seq/hg19/hg19.fasta")
            }
        };

        bamSource = new igv.BamSource({
            type: 'bam',
            url: 'http://data.broadinstitute.org/igvdata/1KG/b37/data/NA06984/alignment/NA06984.mapped.ILLUMINA.bwa.CEU.low_coverage.20120522.bam',
            label: 'NA06984'
        });
        ok(bamSource, "bamSource");

        bamSource.getFeatures("chr22", 24379992, 24380390).then(function (genomicInterval) {

            ok(genomicInterval, "alignmentContainer");
            ok(genomicInterval.chr, "alignmentContainer.chr");
            ok(genomicInterval.sequence, "alignmentContainer.sequence");
            ok(genomicInterval.coverageMap, "alignmentContainer.coverageMap");

            igv.browser.genome.sequence.readSequence(genomicInterval.chr, genomicInterval.start, genomicInterval.end).then(function (sequence) {

                ok(sequence, "sequence");
                equal(sequence.length, (genomicInterval.end - genomicInterval.start));

                start();
            }).catch(function (error) {
                console.log(error);
            });
        });
    });

    asyncTest("AlignmentController - Test Block Sequence Creation", function () {

        var bamSource;

        // Mock object
        igv.browser = {
            genome: {
                sequence: new igv.FastaSequence("//igvdata.broadinstitute.org/genomes/seq/hg19/hg19.fasta")
            }
        }

        bamSource = new igv.BamSource({
            type: 'bam',
            url: 'http://data.broadinstitute.org/igvdata/1KG/b37/data/NA06984/alignment/NA06984.mapped.ILLUMINA.bwa.CEU.low_coverage.20120522.bam',
            label: 'NA06984'
        });

        bamSource.getFeatures("chr22", 24379992, 24380390, function (genomicInterval) {

            ok(genomicInterval, "alignmentContainer");
            //ok(alignmentContainer.features, "alignmentContainer.features");

            //alignmentContainer.features.forEach(function(alignment) {
            //
            //    var lengths, seqs;
            //
            //    if (alignment.blocks.length == 1) return;
            //
            //    lengths = "";
            //    seqs = "";
            //    alignment.blocks.forEach(function(block, index, blocks) {
            //
            //        lengths += block.len;
            //
            //        seqs += block.seq;
            //        seqs += "(" + block.seq.length + ")";
            //
            //        if (blocks.length - 1 === index) {
            //            // do nothing
            //        } else {
            //            seqs += " ";
            //            lengths += " ";
            //        }
            //
            //    });
            //
            //    console.log("blocks[" + lengths + "] = " + seqs);
            //});

            start();

        }, undefined);

    });

}
