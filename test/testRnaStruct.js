import RnaStructTrack from "../js/rna/rnaStruct.js";

function runRnaStructTests() {

    // mock object
    var browser = {
        // Simulate a genome with 1,2,3,... naming convention
        genome: {
            getChromosomeName: function (chr) {
                return chr.replace("chr", "");
            }
        },
        constants: {}
    };

    QUnit.test('Test parsing .bp file', function (assert) {

        var done = assert.async();
        var rnaStruct = new igv.RnaStructTrack({url: 'data/bp/example.bp'}, browser);
        rnaStruct.getFeatures('1', 1, 100)
            .then(function (features) {
                assert.ok(features);
                assert.equal(features.length, 8);
                done();
            })
            .catch(function (error) {
                console.error(error);
                assert.ok(false);
                done();
            });
    })
}

export default runRnaStructTests;