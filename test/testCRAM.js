function runCRAMTests() {

    // Mock object
    const genome = {

        getChromosomeName: function (chr) {

            switch (chr) {
                case 'CHROMOSOME_I':
                    return 'chr1';
                case 'CHROMOSOME_II':
                    return 'chr2';
                case 'CHROMOSOME_III':
                    return 'chr3';
                case 'CHROMOSOME_IV':
                    return 'chr4';
                case 'CHROMOSOME_V':
                    return 'chr5'

            }
        }
    }


    QUnit.test("CRAM header", function (assert) {

        var done = assert.async();

        const cramReader = new igv.CramReader({
                url: 'data/cram/ce_5.tmp.cram',
                indexURL: 'data/cram/ce_5.tmp.cram.crai'
            },
            genome);


        cramReader.getHeader()

            .then(function (header) {

                assert.ok(header);

                const expectedChrNames = ['CHROMOSOME_I', 'CHROMOSOME_II', 'CHROMOSOME_III', 'CHROMOSOME_IV', 'CHROMOSOME_V']
                assert.deepEqual(header.chrNames, expectedChrNames)

                done();
            })

            .catch(function (error) {
                console.error(error);
                assert.ok(false, error);  // failed

            });
    });


}



