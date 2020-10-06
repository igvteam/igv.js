import FeatureFileReader from "../js/feature/featureFileReader.js";
import FeatureSource from "../js/feature/featureSource.js";
import {assert} from 'chai';
import {createMockObjects} from "@igvteam/test-utils/src"

suite("testBed", function () {

    createMockObjects();

    const genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }

    test("Empty lines", async function () {
        const config = {
            format: "bed",
            url: require.resolve("./data/bed/basic_feature_3_columns_empty_lines.bed"),
        }
        const reader = FeatureSource(config, genome);
        const features = await reader.getFeatures({chr: "chr1", bpStart: 0, bpEnd: 128756129})
        assert.ok(features);
        assert.equal(features.length, 6);
    })

    test("Empty lines - gzipped", async function () {
        const config = {
            format: "bed",
            url: require.resolve("./data/bed/basic_feature_3_columns_empty_lines.bed.gz"),
        }
        const reader = FeatureSource(config, genome);
        const features = await reader.getFeatures({chr: "chr1", bpStart: 0, bpEnd: 128756129});
        assert.ok(features);
        assert.equal(features.length, 6);
    })


    test("GWAS Catalog format", async function () {
        const config = {
            format: "gwasCatalog",
            indexed: false,
            url: require.resolve("./data/bed/gwasCatalog.test.txt")
        }
        const reader = new FeatureFileReader(config);
        const features = await reader.readFeatures("chr1", 0, Number.MAX_VALUE);
        assert.ok(features);
        assert.equal(features.length, 3);
        assert.equal(features[0].name, 'rs141175086');
    })

    test("wgRna format", async function () {
        const config = {
            format: "wgRna",
            indexed: false,
            url: require.resolve("./data/bed/wgRna.test.txt")
        }
        const reader = new FeatureFileReader(config);
        const features = await reader.readFeatures("chr1", 0, Number.MAX_VALUE);
        assert.ok(features);
        assert.equal(features.length, 3);
        assert.equal(features[0].name, 'hsa-mir-1302-2');
    })

    test("cpgIslandExt format", async function () {

        const config = {
            format: "cpgIslandExt",
            indexed: false,
            url: require.resolve("./data/bed/cpgIslandExt.test.txt")
        }
        const reader = new FeatureFileReader(config);
        const features = await reader.readFeatures("chr1", 0, Number.MAX_VALUE);
        assert.ok(features);
        assert.equal(features.length, 3);
        assert.equal(features[0].name, 'CpG: 111');
    })

    test("ensgene format", async function () {

        const config = {
            format: "ensgene",
            indexed: false,
            url: require.resolve("./data/bed/ensGene.test.txt")
        }
        const reader = new FeatureFileReader(config);

        const features = await reader.readFeatures("chr1", 0, Number.MAX_VALUE);
        assert.ok(features);
        assert.equal(features.length, 3);
        assert.equal(features[0].name, 'ENSDART00000164359.1');
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

    test("UCSC repeat masker format", async function () {

        const config = {
            type: "annotation",
            format: "rmsk",
            indexed: false,
            url: require.resolve("./data/bed/Low_complexity.rmask")
        }
        const reader = new FeatureFileReader(config);
        const features = await reader.readFeatures("chr1", 0, Number.MAX_VALUE);
        assert.ok(features);
        assert.equal(features.length, 3);

        const f = features[0];
        assert.equal("chr1", f.chr);
        assert.equal(46216, f.start);
        assert.equal(46240, f.end);
        assert.equal(f.repName, 'AT_rich');
    })


    test("BED query", async function () {

        var chr = "chr1",
            bpStart = 67655271,
            bpEnd = 67684468,
            featureSource = FeatureSource({
                    format: 'bed',
                    indexed: false,
                    url: require.resolve('./data/bed/basic_feature_3_columns.bed')
                },
                genome);

        // Must get file header first
        await featureSource.getHeader();
        const features = await featureSource.getFeatures({chr, bpStart, bpEnd});
        assert.ok(features);
        assert.equal(128, features.length);   // feature count. Determined by grepping file
    });

    test("BED track line", async function () {

        const featureSource = FeatureSource({
                format: 'bed',
                indexed: false,
                url: require.resolve('./data/bed/basic_feature_3_columns.bed')
            },
            genome);

        const header = await featureSource.getHeader();
        assert.ok(header);
        assert.equal(header.name, "Basic Features");
        assert.equal(header.color, "255,0,0");
    });

    test("BED query gzip", async function () {

        const chr = "chr1",
            bpStart = 67655271,
            bpEnd = 67684468,
            featureSource = FeatureSource({
                    format: 'bed',
                    url: require.resolve('./data/bed/basic_feature_3_columns.bed.gzipped')
                },
                genome);

        const features = await featureSource.getFeatures({chr, bpStart, bpEnd});
        assert.ok(features);
        assert.equal(128, features.length);   // feature count. Determined by grepping file
        assert.equal(chr, features[0].chr); // ensure features chromosome is specified chromosome
    });

    test("broadPeak parsing ", async function () {

        const featureSource = FeatureSource({
            format: 'broadPeak',
            url: require.resolve("./data/peak/test.broadPeak")
        });
        const chr = "chr22";
        const bpStart = 16847690;
        const bpEnd = 20009819;
        const features = await featureSource.getFeatures({chr, bpStart, bpEnd});
        assert.ok(features);
        assert.equal(features.length, 100);   // # of features over this region
        const feature = features[0];
        assert.equal(chr, feature.chr);
        assert.equal(feature.start, 16847690);
        assert.ok(feature.end > bpStart);
        assert.equal(feature.signal, 5.141275);
    });


    test("refflat parsing ", async function () {

        const featureSource = FeatureSource({
                format: 'refflat',
                url: require.resolve("./data/bed/myc_refFlat.txt")
            },
            genome);

        const chr = "chr1";
        const bpStart = 1;
        const bpEnd = Number.MAX_VALUE;
        const features = await featureSource.getFeatures({chr, bpStart, bpEnd});
        assert.ok(features);
        assert.equal(10, features.length);   // # of features over this region
        const feature = features[0];
        assert.equal("GJA9-MYCBP", feature.name);
        assert.equal(chr, feature.chr);
        assert.equal(39328161, feature.start);
        assert.ok(feature.end > bpStart);
        assert.equal(7, feature.exons.length);
    });


    test("genepred parsing ", async function () {

        const featureSource = FeatureSource({
                format: 'genePred',
                url: require.resolve("./data/bed/genePred_myc_hg38.txt")
            },
            genome);

        const chr = "chr8";
        const bpStart = 1;
        const bpEnd = Number.MAX_VALUE;
        const features = await featureSource.getFeatures({chr, bpStart, bpEnd});
        assert.ok(features);
        assert.equal(7, features.length);   // # of features over this region
        const feature = features[0];
        assert.equal("uc022bbe.2", feature.name);
        assert.equal(chr, feature.chr);
        assert.equal(127735433, feature.start);
        assert.ok(feature.end > bpStart);
        assert.equal(3, feature.exons.length);
    });


    test("refgene parsing ", async function () {

        const featureSource = FeatureSource({
                format: 'refgene',
                url: require.resolve("./data/bed/myc_refGene_genePredExt.txt")
            },
            genome);

        const chr = "chr1";
        const bpStart = 1;
        const bpEnd = Number.MAX_VALUE;
        const features = await featureSource.getFeatures({chr, bpStart, bpEnd});
        assert.ok(features);
        assert.equal(10, features.length);   // # of features over this region
        const feature = features[0];
        assert.equal("GJA9-MYCBP", feature.name);
        assert.equal(chr, feature.chr);
        assert.equal(39328161, feature.start);
        assert.ok(feature.end > bpStart);
        assert.equal(3, feature.exons.length);

    })

    test("ucsc interact", async function () {

        const featureSource = FeatureSource({
            url: require.resolve("./data/bed/ucsc_interact_1.bed")
        });

        const trackType = await featureSource.trackType();
        const header = await featureSource.getHeader();

        assert.equal(header.format, "interact");
        assert.equal(trackType, "interact");
    })

    test("gcnv", async function() {

        const featureSource = FeatureSource({
            url: require.resolve("./data/bed/gcnv_track_example_data.chr22.bed")
        });

        const trackType = await featureSource.trackType();
        const header = await featureSource.getHeader();

        assert.equal(header.format, "gcnv");
        assert.equal(trackType, "gcnv");
        assert.equal(header.columnNames.length, 172);
        assert.equal(header.highlight.length, 2);

        const features = await featureSource.getFeatures({chr: "chr22", bpStart: 0, bpEnd: Number.MAX_SAFE_INTEGER});
        assert.equal(features.length, 10);

    })

    test("Chr aliasing", async function () {

        const config = {
            format: "bed",
            url: require.resolve("./data/bed/basic_feature_3_columns.bed"),
        }
        const featureSource = FeatureSource(config, genome);
        const features = await featureSource.getFeatures({chr: "1", bpStart: 67658429, bpEnd: 67659549});
        assert.ok(features);
        assert.equal(features.length, 4);

    })

})

