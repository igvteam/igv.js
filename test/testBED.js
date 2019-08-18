import FeatureFileReader from "../js/feature/featureFileReader.js";
import FeatureSource from "../js/feature/featureSource.js";

function runBedTests() {

    // mock objects
    const genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }

    //
    // QUnit.test("Missing line feed  - gzipped", function(assert) {
    //
    //     var done = assert.async();
    //
    //     var chr = "chr1",
    //         bpStart = 0,
    //         bpEnd = Number.MAX_VALUE,
    //         featureSource = new igv.FeatureSource({
    //                 format: 'bed',
    //                 indexed: false,
    //                 url: 'data/bed/missing_linefeed.bed.gz'
    //             },
    //             genome);
    //
    //     // Must get file header first
    //     featureSource.getFeatures(chr, bpStart, bpEnd)
    //         .then(function (features) {
    //
    //             assert.equal(4, features.length);   // feature count. Determined by grepping file
    //
    //             done();
    //         })
    //         .catch(function (error) {
    //             console.log(error);
    //         });
    // });
    //
    //
    // QUnit.test("UCSC SNP format", function (assert) {
    //
    //     const done = assert.async();
    //
    //     const config = {
    //         format: "snp",
    //         indexed: false,
    //         url: "data/snp/ucsc_snp.txt"
    //     }
    //
    //     const reader = new igv.FeatureFileReader(config);
    //
    //     reader.readFeatures("chr1", 0, Number.MAX_VALUE)
    //         .then(features => {
    //             assert.ok(features);
    //             assert.equal(features.length, 3);
    //             assert.equal(features[0].submitters, '1000GENOMES,BILGI_BIOE,');
    //             done();
    //         })
    //         .catch(function (error) {
    //             console.error(error);
    //             assert.ok(false);
    //             done;
    //         })
    // })

    QUnit.test("GWAS Catalog format", function (assert) {

        ///Users/jrobinso/Dropbox/projects/igv.js/test/data/bed/gwasCatalog.test.txt
        const done = assert.async();

        const config = {
            format: "gwasCatalog",
            indexed: false,
            url: "data/bed/gwasCatalog.test.txt"
        }

        const reader = new FeatureFileReader(config);

        reader.readFeatures("chr1", 0, Number.MAX_VALUE)
            .then(features => {
                assert.ok(features);
                assert.equal(features.length, 3);
                assert.equal(features[0].name, 'rs141175086');
                done();
            })
            .catch(function (error) {
                console.error(error);
                assert.ok(false);
                done;
            })
    })

    QUnit.test("wgRna format", function (assert) {

        ///Users/jrobinso/Dropbox/projects/igv.js/test/data/bed/gwasCatalog.test.txt
        const done = assert.async();

        const config = {
            format: "wgRna",
            indexed: false,
            url: "data/bed/wgRna.test.txt"
        }

        const reader = new FeatureFileReader(config);

        reader.readFeatures("chr1", 0, Number.MAX_VALUE)
            .then(features => {
                assert.ok(features);
                assert.equal(features.length, 3);
                assert.equal(features[0].name, 'hsa-mir-1302-2');
                done();
            })
            .catch(function (error) {
                console.error(error);
                assert.ok(false);
                done;
            })
    })

    QUnit.test("cpgIslandExt format", function (assert) {

        ///Users/jrobinso/Dropbox/projects/igv.js/test/data/bed/gwasCatalog.test.txt
        const done = assert.async();

        const config = {
            format: "cpgIslandExt",
            indexed: false,
            url: "data/bed/cpgIslandExt.test.txt"
        }

        const reader = new FeatureFileReader(config);

        reader.readFeatures("chr1", 0, Number.MAX_VALUE)
            .then(features => {
                assert.ok(features);
                assert.equal(features.length, 3);
                assert.equal(features[0].name, 'CpG: 111');
                done();
            })
            .catch(function (error) {
                console.error(error);
                assert.ok(false);
                done;
            })
    })

    QUnit.test("ensgene format", function (assert) {

        const done = assert.async();

        const config = {
            format: "ensgene",
            indexed: false,
            url: "data/bed/ensGene.test.txt"
        }

        const reader = new FeatureFileReader(config);

        reader.readFeatures("chr1", 0, Number.MAX_VALUE)
            .then(features => {
                assert.ok(features);
                assert.equal(features.length, 3);
                assert.equal(features[0].name, 'ENSDART00000164359.1');
                done();
            })
            .catch(function (error) {
                console.error(error);
                assert.ok(false);
                done;
            })
    })


    /* 0  bin    585    smallint(5) unsigned    Indexing field to speed chromosome range queries.
    * 1  swScore    1504    int(10) unsigned    Smith Waterman alignment score
    * 2  milliDiv    13    int(10) unsigned    Base mismatches in parts per thousand
    * 3  milliDel    4    int(10) unsigned    Bases deleted in parts per thousand
    * 4  milliIns    13    int(10) unsigned    Bases inserted in parts per thousand
    * 5  genoName    chr1    varchar(255)    Genomic sequence name
    * 6  genoStart    10000    int(10) unsigned    Start in genomic sequence
    * 7  genoEnd    10468    int(10) unsigned    End in genomic sequence
    * 8  genoLeft    -249240153    int(11)    -#bases after match in genomic sequence
    * 9  strand    +    char(1)    Relative orientation + or -
    * 10 repName    (CCCTAA)n    varchar(255)    Name of repeat
    * 11 repClass    Simple_repeat    varchar(255)    Class of repeat
    * 12 repFamily    Simple_repeat    varchar(255)    Family of repeat
    * 13 repStart    1    int(11)    Start (if strand is +) or -#bases after match (if strand is -) in repeat sequence
    * 14 repEnd    463    int(11)    End in repeat sequence
    * 15 repLeft    0    int(11)    -#bases after match (if strand is +) or start (if strand is -) in repeat sequence
    * 16 id    1    char(1)    First digit of id field in RepeatMasker .out file. Best ignored. */
    //24	0	0	0	chr1	46216	46240	-249204381	+	AT_rich	Low_complexity	Low_complexity	1	24	0	4
    QUnit.test("UCSC repeat masker format", function (assert) {

        const done = assert.async();

        const config = {
            type: "annotation",
            format: "rmsk",
            indexed: false,
            url: "data/bed/Low_complexity.rmask"
        }

        const reader = new FeatureFileReader(config);

        reader.readFeatures("chr1", 0, Number.MAX_VALUE)

            .then(features => {
                assert.ok(features);
                assert.equal(features.length, 3);

                const f = features[0];
                assert.equal("chr1", f.chr);
                assert.equal(46216, f.start);
                assert.equal(46240, f.end);
                assert.equal(f.repName, 'AT_rich');

                done();
            })
            .catch(function (error) {
                console.error(error);
                assert.ok(false);
                done;
            })
    })


    QUnit.test("BED query", function(assert) {

        var done = assert.async();

        var chr = "chr1",
            bpStart = 67655271,
            bpEnd = 67684468,
            featureSource = new FeatureSource({
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

        var featureSource = new FeatureSource({
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
            featureSource = new FeatureSource({
                    format: 'bed',
                    url: 'data/bed/basic_feature_3_columns.bed.gzipped'
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

        featureSource = new FeatureSource({
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

        featureSource = new FeatureSource({
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

        featureSource = new FeatureSource({
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

        featureSource = new FeatureSource({
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

export default runBedTests;
