function runHtsgetTests() {
    // mock object

    const genome = {
        getChromosomeName: function (chr) {
            return "chr" + chr;
        }
    }


    asyncTest('Load Urls - DNANexus', function () {

        const url = 'http://htsnexus.rnd.dnanex.us/v1',
            id = 'BroadHiSeqX_b37/NA12878',
            chr = 'chr1',
            s = 10000,
            end = 10100;

        const reader = new igv.HtsgetReader({endpoint: url, id: id}, genome);


        reader.readAlignments(chr, s, end)

            .then(function (alignmentContainer) {
                ok(alignmentContainer);
                ok(alignmentContainer.alignments.length > 0);
                start();
            })
            .catch(function (error) {
                console.log(error);
                ok(false);
                start();
            });
    });

    asyncTest('Load Urls - EBI', function () {

        var url = 'http://35.196.212.220',
            id = 'genomics-public-data/platinum-genomes/bam/NA12877_S1.bam',
            chr = 'chr1',
            s = 10000,
            end = 10100;

        var reader = new igv.HtsgetReader({endpoint: url, id: id});
        reader.readAlignments(chr, s, end).then(function (alignmentContainer) {

            ok(alignmentContainer);
            ok(alignmentContainer.alignments.length > 0);
            start();
        });
    });
}
