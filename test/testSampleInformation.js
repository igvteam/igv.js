import loadPlinkFile from "../js/sampleInformation.js";

function runSampleInformationTests() {

    // mock object
    const browser = {
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

    QUnit.test('Load Plink', function (assert) {
        var done = assert.async();

        loadPlinkFile('data/misc/pedigree.fam')

            .then(function (sampleInformation) {

                const attributes = sampleInformation.getAttributes('SS0012979');
                assert.ok(attributes);
                assert.equal(attributes.familyId, "14109");
                done();
            })

            .catch(function (error) {
                console.log(error);
                assert.ok(false);
                done();
            });

    })
}

export default runSampleInformationTests;