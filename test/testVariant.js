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
    asyncTest("1KG sites", function () {

        const trackConfig = {
            type: "variant",
            format: "vcf",
            url: "https://s3.amazonaws.com/1000genomes/release/20130502/ALL.wgs.phase3_shapeit2_mvncall_integrated_v5b.20130502.sites.vcf.gz",
            indexURL: "https://s3.amazonaws.com/1000genomes/release/20130502/ALL.wgs.phase3_shapeit2_mvncall_integrated_v5b.20130502.sites.vcf.gz.tbi"
        };

        const reader = new igv.FeatureFileReader(trackConfig, genome);

        const chr = "chr8";
        const s = 128747315;
        const e = 128754680;

        reader.readHeader()
            .then(function (header) {
                reader.readFeatures(chr, s, e)
                    .then(function (features) {
                        ok(features);
                        ok(features.length > 0);
                        start();
                    })

            })
            .catch(function (error) {
                console.error(error);
                ok(false);
                start();
            })
    })

    test("Test ref block", 1, function () {

        var json = '{"referenceName": "7","start": "117242130","end": "117242918","referenceBases": "T","alternateBases": ["\u003cNON_REF\u003e"]}';

        var obj = JSON.parse(json);

        var variant = igv.createGAVariant(obj);

        ok(variant.isRefBlock());
    });

    test("Test insertion", function () {

        var json = '{"referenceName": "7","start": "117242918","end": "117242919","referenceBases": "T","alternateBases": ["TA"]}';

        var obj = JSON.parse(json);

        var variant = igv.createGAVariant(obj);

        ok(variant.isRefBlock() === false);

        equal(117242919, variant.start);

    });

    test("Test deletion", function () {

        var json = '{"referenceName": "7","start": "117242918","end": "117242920","referenceBases": "TA","alternateBases": ["T"]}';

        var obj = JSON.parse(json);

        var variant = igv.createGAVariant(obj);

        ok(variant.isRefBlock() === false);

        equal(117242919, variant.start);

    });
}
