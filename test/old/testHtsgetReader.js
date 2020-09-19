import HtsgetReader from "../../js/bam/htsgetReader.js";

function runHtsgetTests() {
    // mock object

    const genome = {
        getChromosomeName: function (chr) {
            return "chr" + chr;
        }
    }

    QUnit.test('Load Urls - EBI', function (assert) {

        var done = assert.async();
        var id = 'genomics-public-data/platinum-genomes/bam/NA12877_S1.bam',
            chr = 'chr1',
            s = 10000,
            end = 10100;

        const trackConfig = {
            url: 'http://35.196.212.220',
            endpoint: '/reads/',
            id: id
        }

        const reader = new HtsgetReader(trackConfig);
        reader.readAlignments(chr, s, end).then(function (alignmentContainer) {

            assert.ok(alignmentContainer);
            assert.ok(alignmentContainer.alignments.length > 0);
            done();
        });
    });

    QUnit.test('Load Urls - EBI - Legacy convention', function (assert) {
        var done = assert.async();

        var endpoint = 'http://35.196.212.220',
            id = 'genomics-public-data/platinum-genomes/bam/NA12877_S1.bam',
            chr = 'chr1',
            s = 10000,
            end = 10100;

        var reader = new HtsgetReader({endpoint: endpoint, id: id});
        reader.readAlignments(chr, s, end).then(function (alignmentContainer) {

            assert.ok(alignmentContainer);
            assert.ok(alignmentContainer.alignments.length > 0);
            done();
        });
    });
}

export default runHtsgetTests;
