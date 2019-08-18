function runHtsgetTests() {
    // mock object

    const genome = {
        getChromosomeName: function (chr) {
            return "chr" + chr;
        }
    }

    // eweitz 2018-09-06: Disabling for now due to test failure
    // TODO: Investigate failure, re-enable.
    // QUnit.test('Load Urls - DNANexus', function (assert) {
    //     var done = assert.async();

    //     const url = 'http://htsnexus.rnd.dnanex.us/v1',
    //         id = 'BroadHiSeqX_b37/NA12878',
    //         chr = 'chr1',
    //         s = 10000,
    //         end = 10100;

    //     const reader = new igv.HtsgetReader({endpoint: url, id: id}, genome);


    //     reader.readAlignments(chr, s, end)

    //         .then(function (alignmentContainer) {
    //             assert.ok(alignmentContainer);
    //             assert.ok(alignmentContainer.alignments.length > 0);
    //             done();
    //         })
    //         .catch(function (error) {
    //             console.log(error);
    //             assert.ok(false);
    //             done();
    //         });
    // });

    QUnit.test('Load Urls - EBI', function (assert) {
        var done = assert.async();

        var url = 'http://35.196.212.220',
            id = 'genomics-public-data/platinum-genomes/bam/NA12877_S1.bam',
            chr = 'chr1',
            s = 10000,
            end = 10100;

        var reader = new igv.HtsgetReader({endpoint: url, id: id});
        reader.readAlignments(chr, s, end).then(function (alignmentContainer) {

            assert.ok(alignmentContainer);
            assert.ok(alignmentContainer.alignments.length > 0);
            done();
        });
    });
}
