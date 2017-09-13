function runSampleInformationTests() {


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

    asyncTest('Load Plink', function() {
        igv.sampleInformation.loadPlinkFile('data/misc/pedigree.fam').then(function(attributes) {
            ok(attributes);
            console.log(attributes);
            equal(attributes['SS0012979'].familyId, 14109);
            equal(igv.sampleInformation.getAttributes('SS0012979').familyId, 14109);

        });
    })

}