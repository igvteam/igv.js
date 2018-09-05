function runBedTests() {


    // mock objects
    const genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }


    QUnit.test("Missing line feed  - gzipped", function(assert) {

        var done = assert.async();

        var chr = "chr1",
            bpStart = 0,
            bpEnd = Number.MAX_VALUE,
            featureSource = new igv.FeatureSource({
                    format: 'bed',
                    indexed: false,
                    url: 'data/bed/missing_linefeed.bed.gz'
                },
                genome);

        // Must get file header first
        featureSource.getFeatures(chr, bpStart, bpEnd)
            .then(function (features) {

                assert.equal(4, features.length);   // feature count. Determined by grepping file

                done();
            })
            .catch(function (error) {
                console.log(error);
            });
    });

    // eweitz 2018-09-05: Commenting out for now, due to seeming false positive.
    // Chrome DevTools reports http://127.0.0.1:8887/igv.js/test/data/bed/missing_linefeed.bed.gz
    // as having response code 206 Partial Content.  The test does not terminate when run
    // in the browser, breaking such test runs.
    // QUnit.test("Missing line feed  - block gzipped", function(assert) {

    //     var done = assert.async();

    //     var config = {
    //         format: 'bed',
    //         url: 'data/bed/missing_linefeed.bed.gz',
    //         indexURL: 'data/bed/missing_linefeed.bed.gz.tbi'
    //     }

    //     var tb = new igv.FeatureFileReader(config);

    //     var chr = "chr1",
    //         bpStart = 0,
    //         bpEnd = Number.MAX_VALUE;

    //     tb.readHeader()
    //         .then(function (header) {

    //             tb.readFeatures(chr, bpStart, bpEnd)
    //                 .then(function (features) {

    //                     assert.equal(4, features.length);   // feature count. Determined by grepping file

    //                     done();
    //                 });
    //         })
    //         .catch(function (error) {
    //             console.log(Error('query tabix error: ') + error);
    //             console.log(error.stack);
    //         });

    // });


    QUnit.test("BED query", function(assert) {

        var done = assert.async();

        var chr = "chr1",
            bpStart = 67655271,
            bpEnd = 67684468,
            featureSource = new igv.FeatureSource({
                    format: 'bed',
                    indexed: false,
                    url: 'data/bed/basic_feature_3_columns.bed'
                },
                genome);

        // Must get file header first
        featureSource.getFileHeader().then(function (header) {
            featureSource.getFeatures(chr, bpStart, bpEnd).then(function (features) {

                assert.ok(features);
                assert.equal(128, features.length);   // feature count. Determined by grepping file
                assert.equal(chr, features[0].chr); // ensure features chromosome is specified chromosome

                done();
            }, undefined);
        }).catch(function (error) {
            console.log(error);
        });
    });

    QUnit.test("BED track line", function(assert) {

        var done = assert.async();

        var featureSource = new igv.FeatureSource({
                format: 'bed',
                indexed: false,
                url: 'data/bed/basic_feature_3_columns.bed'
            },
            genome);

        featureSource.getFileHeader().then(function (header) {

            assert.ok(header);
            assert.equal(header.name, "Basic Features");
            assert.equal(header.color, "255,0,0");
            done();
        });

    });

    QUnit.test("BED query gzip", function(assert) {

        var done = assert.async();

        var chr = "chr1",
            bpStart = 67655271,
            bpEnd = 67684468,
            featureSource = new igv.FeatureSource({
                    format: 'bed',
                    url: 'data/bed/basic_feature_3_columns.bed.gz'
                },
                genome);

        featureSource.getFeatures(chr, bpStart, bpEnd).then(function (features) {

            assert.ok(features);
            assert.equal(128, features.length);   // feature count. Determined by grepping file
            assert.equal(chr, features[0].chr); // ensure features chromosome is specified chromosome

            done();
        }, undefined);

    });

    QUnit.test("broadPeak parsing ", function(assert) {

        var done = assert.async();

        var featureSource,
            chr,
            bpStart,
            bpEnd;

        featureSource = new igv.FeatureSource({
            format: 'broadPeak',
            url: "data/peak/test.broadPeak"
        });

        chr = "chr22";
        bpStart = 16847690;
        bpEnd = 20009819;
        featureSource.getFeatures(chr, bpStart, bpEnd).then(function (features) {

            var feature;

            assert.ok(features);
            assert.equal(features.length, 100);   // # of features over this region

            feature = features[0];
            assert.equal(chr, feature.chr);

            assert.equal(feature.start, 16847690);
            assert.ok(feature.end > bpStart);
            assert.equal(feature.signal, 5.141275);

            done();

        }, undefined);

    });


    QUnit.test("refflat parsing ", function(assert) {

        var done = assert.async();

        var featureSource,
            chr,
            bpStart,
            bpEnd;

        featureSource = new igv.FeatureSource({
                format: 'refflat',
                url: "data/bed/myc_refFlat.txt"
            },
            genome);

        chr = "chr1";
        bpStart = 1;
        bpEnd = Number.MAX_VALUE;
        featureSource.getFeatures(chr, bpStart, bpEnd).then(function (features) {

            var feature;

            assert.ok(features);
            assert.equal(10, features.length);   // # of features over this region

            feature = features[0];
            assert.equal("GJA9-MYCBP", feature.name);
            assert.equal(chr, feature.chr);

            assert.equal(39328161, feature.start);
            assert.ok(feature.end > bpStart);
            assert.equal(7, feature.exons.length);

            done();

        }, undefined);

    });


    QUnit.test("genepred parsing ", function(assert) {

        var done = assert.async();

        var featureSource,
            chr,
            bpStart,
            bpEnd;

        featureSource = new igv.FeatureSource({
                format: 'genePred',
                url: "data/bed/genePred_myc_hg38.txt"
            },
            genome);

        chr = "chr8";
        bpStart = 1;
        bpEnd = Number.MAX_VALUE;
        featureSource.getFeatures(chr, bpStart, bpEnd).then(function (features) {

            var feature;

            assert.ok(features);
            assert.equal(7, features.length);   // # of features over this region

            feature = features[0];
            assert.equal("uc022bbe.2", feature.name);
            assert.equal(chr, feature.chr);

            assert.equal(127735433, feature.start);
            assert.ok(feature.end > bpStart);
            assert.equal(3, feature.exons.length);

            done();

        }, undefined);

    });


    QUnit.test("refgene parsing ", function(assert) {

        var done = assert.async();

        var featureSource,
            chr,
            bpStart,
            bpEnd;

        featureSource = new igv.FeatureSource({
                format: 'refgene',
                url: "data/bed/myc_refGene_genePredExt.txt"
            },
            genome);

        chr = "chr1";
        bpStart = 1;
        bpEnd = Number.MAX_VALUE;
        featureSource.getFeatures(chr, bpStart, bpEnd).then(function (features) {

            var feature;

            assert.ok(features);
            assert.equal(10, features.length);   // # of features over this region

            feature = features[0];
            assert.equal("GJA9-MYCBP", feature.name);
            assert.equal(chr, feature.chr);

            assert.equal(39328161, feature.start);
            assert.ok(feature.end > bpStart);
            assert.equal(3, feature.exons.length);

            done();

        }, undefined);

    });

}
