function runSampleInformationTests() {


    // mock object

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

    QUnit.test('Load Plink', function (assert) {
        var done = assert.async();

        igv.sampleInformation.loadPlinkFile('data/misc/pedigree.fam')

            .then(function (attributes) {

                assert.ok(attributes);
                console.log(attributes);
                assert.equal(attributes['SS0012979'].familyId, 14109);
                assert.equal(igv.sampleInformation.getAttributes('SS0012979').familyId, 14109);
                done();
            })

            .catch(function (error) {
                console.log(error);
                assert.ok(false);
                done();
            });

    })

}