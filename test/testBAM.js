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

    asyncTest("Bag magic bam", function () {

        var chr = "1",
            beg = 34000,
            end = 36000,
            bamReader;

        bamReader = new igv.BamReader({
            type: 'bam',
            url: 'data/bam/trimmed_edited.bam',
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
    })

    asyncTest("4 alignment bam", function () {

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
            ok(alignments, "alignments");
            equal(4, alignments.length, "alignments.length");

            start();
        }).catch(function (error) {
            ok(false, error);  // failed
        });
    });

    asyncTest("throws exception with wrong magic", function (assert) {
        expect(3);
        var bamReader = new igv.BamReader({
            type: 'bam',
            url: 'data/bam/wrong.magic.bam',
            label: 'wrong BAM magic unit test'
        });


        bamReader.readHeader().then(function(header) {
            strictEqual(typeof header, 'undefined', "shouldn't be unable to parse header");

            start();
        }).catch(function (error){
            var re = /^BAM header contains an invalid BAM magic$/i;
            ok(error, "error is thrown");
            ok(error.message, 'error has a message');
            ok(re.test(error.message), 'message matches expected');

            start();
        });
    });

    //
    // asyncTest("alignments for range", function () {
    //
    //     var chr = "chr22",
    //         beg = 24375199,
    //         end = 24378544,
    //         bamReader;
    //
    //     bamReader = new igv.BamReader({
    //         type: 'bam',
    //         url: dataURL + 'bam/gstt1_sample.bam',
    //         label: 'BAM unit test'
    //     });
    //
    //     bamReader.readAlignments(chr, beg, end).then(function (alignments) {
    //
    //         ok(alignments, "alignments");
    //         equal(3345, alignments.length, "alignments.length");
    //
    //         start();
    //     }).catch(function (error) {
    //         ok(false, error);  // failed
    //     });
    // });
    //
    // asyncTest("header", function () {
    //
    //     var bamPath = dataURL + "bam/gstt1_sample.bam",
    //         bamFile = new igv.BamReader({
    //             type: 'bam',
    //             url: bamPath,
    //             label: 'NA06984'
    //         });
    //
    //     bamFile.readHeader().then(function () {
    //
    //         ok(bamFile.chrToIndex["chr1"] === 0);
    //         start();
    //
    //     }).catch(function (error) {
    //         ok(false, error);  // failed
    //     })
    // });


}



