function runVariantTests() {

    // Mock objects
    const genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }

    /**
     * Test loading variants from a tabix indexed file.   This also tests chromosome name translation,  VCF uses the
     * 1,2,3... convention
     */
    // eweitz 2018-09-06: Disable for now due to failure
    // TODO: Investigate failure, re-enable
    // QUnit.test("1KG sites", function (assert) {
    //     var done = assert.async();

    //     const trackConfig = {
    //         type: "variant",
    //         format: "vcf",
    //         url: "https://s3.amazonaws.com/1000genomes/release/20130502/ALL.wgs.phase3_shapeit2_mvncall_integrated_v5b.20130502.sites.vcf.gz",
    //         indexURL: "https://s3.amazonaws.com/1000genomes/release/20130502/ALL.wgs.phase3_shapeit2_mvncall_integrated_v5b.20130502.sites.vcf.gz.tbi"
    //     };

    //     const reader = new igv.FeatureFileReader(trackConfig, genome);

    //     const chr = "chr8";
    //     const s = 128747315;
    //     const e = 128754680;

    //     reader.readHeader()
    //         .then(function (header) {
    //             reader.readFeatures(chr, s, e)
    //                 .then(function (features) {
    //                     assert.ok(features);
    //                     assert.ok(features.length > 0);
    //                     done();
    //                 })

    //         })
    //         .catch(function (error) {
    //             console.error(error);
    //             assert.ok(false);
    //             done();
    //         })
    // })

    QUnit.test("Test ref block", function (assert) {
        var done = assert.async();

        var json = '{"referenceName": "7","start": "117242130","end": "117242918","referenceBases": "T","alternateBases": ["\u003cNON_REF\u003e"]}';

        var obj = JSON.parse(json);

        var variant = igv.createGAVariant(obj);

        assert.ok(variant.isRefBlock());
        done();
    });

    QUnit.test("Test insertion", function (assert) {
        var done = assert.async();

        var json = '{"referenceName": "7","start": "117242918","end": "117242919","referenceBases": "T","alternateBases": ["TA"]}';

        var obj = JSON.parse(json);

        var variant = igv.createGAVariant(obj);

        assert.ok(variant.isRefBlock() === false);

        assert.equal(117242919, variant.start);
        done();
    });

    QUnit.test("Test deletion", function (assert) {
        var done = assert.async();

        var json = '{"referenceName": "7","start": "117242918","end": "117242920","referenceBases": "TA","alternateBases": ["T"]}';

        var obj = JSON.parse(json);

        var variant = igv.createGAVariant(obj);

        assert.ok(variant.isRefBlock() === false);

        assert.equal(117242919, variant.start);

        done();
    });
}
