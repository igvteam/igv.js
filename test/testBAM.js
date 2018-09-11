function runBAMTests() {

    var dataURL = "https://data.broadinstitute.org/igvdata/test/data/"

    // Mock object
    igv.browser = {
        genome: {
            sequence: new igv.FastaSequence({
                fastaURL: "https://igvdata.broadinstitute.org/genomes/seq/hg19/hg19.fasta"
            }),
            getChromosomeName: function(chr) {return chr}
        }
    };


    QUnit.test("4 alignment bam", function (assert) {

				var done = assert.async();

        var chr = "13",
            beg = 32353128,
            end = 32353284,
            bamReader;

        bamReader = new igv.BamReader({
            type: 'bam',
            url: dataURL + 'bam/four.reads.bam',
            label: 'BAM unit test'
        });

        bamReader.readAlignments(chr, beg, end).then(function (alignmentContainer) {
            var alignments = alignmentContainer.alignments;
            assert.ok(alignments, "alignments");
            assert.equal(4, alignments.length, "alignments.length");

            done();
        }).catch(function (error) {
            assert.ok(false, error);  // failed
        });
    });
    
    QUnit.test("alignments for range", function (assert) {

				var done = assert.async();

        var chr = "chr22",
            beg = 24375199,
            end = 24378544,
            bamReader;

        bamReader = new igv.BamReader({
            type: 'bam',
            url: dataURL + 'bam/gstt1_sample.bam',
            label: 'BAM unit test'
        });

        bamReader.readAlignments(chr, beg, end).then(function (alignments) {

            assert.ok(alignments, "alignments");
            assert.equal(3345, alignments.length, "alignments.length");

            done();
        }).catch(function (error) {
            assert.ok(false, error);  // failed
        });
    });



}



