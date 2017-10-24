function runHtsgetTests() {
    // mock object
    if (igv === undefined) {
        igv = {};
    }

    igv.browser = {
        getFormat: function () {
        },

        genome: {
            getChromosome: function (chr) {
            },
            getChromosomeName: function (chr) {
                return chr
            }
        }
    };

    asyncTest('Load Urls', function() {

        var url = 'http://htsnexus.rnd.dnanex.us/v1/reads/',
            id = 'BroadHiSeqX_b37/NA12878',
            chr = 'chr1',
            start = 10000,
            end = 10100;

        var reader = new igv.HtsgetReader({url: url, id: id});
        reader.readAlignments(chr, start, end).then(function(data) {
            console.log(data);
            ok(data);
        });
    })
}