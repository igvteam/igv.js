function runHtsgetTests() {
    // mock object
    if (igv === undefined) {
        igv = {};
    }

    igv.browser = {
        getFormat: function () {
        },

        genome: {

            getChromosomeName: function (chr) {
                return "chr" + chr;
            }
        }
    };

    asyncTest('Load Urls', function () {

        var url = 'http://htsnexus.rnd.dnanex.us/v1',
            id = 'BroadHiSeqX_b37/NA12878',
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
