import "./utils/mockObjects.js"
import FeatureFileReader from "../js/feature/featureFileReader.js"
import FeatureSource from "../js/feature/featureSource.js"
import {assert} from 'chai'
import {createGenome} from "./utils/MockGenome.js"
import Genome from "../js/genome/genome.js"

const genome = createGenome()

suite("testBed", function () {

    test("Space delimited", async function () {
        const config = {
            format: "bed",
            url: "test/data/bed/space_delimited.bed",
        }
        const reader = FeatureSource(config, genome)
        const features = await reader.getFeatures({chr: "chr2", start: 0, end: 128756129})
        assert.equal(features.length, 5)
    })

    test("Empty lines", async function () {
        const config = {
            format: "bed",
            url: "test/data/bed/basic_feature_3_columns_empty_lines.bed",
        }
        const reader = FeatureSource(config, genome)
        const features = await reader.getFeatures({chr: "chr1", start: 0, end: 128756129})
        assert.ok(features)
        assert.equal(features.length, 6)
    })

    test("Empty lines - gzipped", async function () {
        const config = {
            format: "bed",
            url: "test/data/bed/basic_feature_3_columns_empty_lines.bed.gz",
        }
        const reader = FeatureSource(config, genome)
        const features = await reader.getFeatures({chr: "chr1", start: 0, end: 128756129})
        assert.ok(features)
        assert.equal(features.length, 6)
    })

    test("GWAS Catalog format", async function () {
        const config = {
            format: "gwasCatalog",
            indexed: false,
            url: "test/data/bed/gwasCatalog.test.txt"
        }
        const reader = new FeatureFileReader(config)
        const features = await reader.readFeatures("chr1", 0, Number.MAX_VALUE)
        assert.ok(features)
        assert.equal(features.length, 3)
        assert.equal(features[0].name, 'rs141175086')
    })

    test("wgRna format", async function () {
        const config = {
            format: "wgRna",
            indexed: false,
            url: "test/data/bed/wgRna.test.txt"
        }
        const reader = new FeatureFileReader(config)
        const features = await reader.readFeatures("chr1", 0, Number.MAX_VALUE)
        assert.ok(features)
        assert.equal(features.length, 3)
        assert.equal(features[0].name, 'hsa-mir-1302-2')
    })

    test("cpgIslandExt format", async function () {

        const config = {
            format: "cpgIslandExt",
            indexed: false,
            url: "test/data/bed/cpgIslandExt.test.txt"
        }
        const reader = new FeatureFileReader(config)
        const features = await reader.readFeatures("chr1", 0, Number.MAX_VALUE)
        assert.ok(features)
        assert.equal(features.length, 3)
        assert.equal(features[0].name, 'CpG: 111')
    })

    test("ensgene format", async function () {

        const config = {
            format: "ensgene",
            indexed: false,
            url: "test/data/bed/ensGene.test.txt"
        }
        const reader = new FeatureFileReader(config)

        const features = await reader.readFeatures("chr1", 0, Number.MAX_VALUE)
        assert.ok(features)
        assert.equal(features.length, 3)
        assert.equal(features[0].name, 'ENSDART00000164359.1')
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
            url: "test/data/bed/Low_complexity.rmask"
        }
        const reader = new FeatureFileReader(config)
        const features = await reader.readFeatures("chr1", 0, Number.MAX_VALUE)
        assert.ok(features)
        assert.equal(features.length, 3)

        const f = features[0]
        assert.equal("chr1", f.chr)
        assert.equal(46216, f.start)
        assert.equal(46240, f.end)
        assert.equal(f.repName, 'AT_rich')
    })

    test("splice junctions", async function () {

        const config = {
            format: "bed",
            indexed: false,
            url: "test/data/bed/splice_junction_track.bed"
        }
        const reader = new FeatureFileReader(config)
        const features = await reader.readFeatures("chr15", 0, Number.MAX_VALUE)
        assert.equal(features.length, 2)

        // motif=CT/AC;uniquely_mapped=2;multi_mapped=2;maximum_spliced_alignment_overhang=36;annotated_junction=true
        // motif=GT/AG;uniquely_mapped=56;multi_mapped=2;maximum_spliced_alignment_overhang=35;annotated_junction=true
        const f1 = features[0]
        assert.equal("CT/AC", f1.getAttributeValue("motif"))    // new API
        assert.equal("CT/AC", f1.attributes["motif"])           // old style
    })

    test("BED query", async function () {

        var chr = "chr1",
            start = 67655271,
            end = 67684468,
            featureSource = FeatureSource({
                    format: 'bed',
                    indexed: false,
                    url: 'test/data/bed/basic_feature_3_columns.bed'
                },
                genome)

        // Must get file header first
        await featureSource.getHeader()
        const features = await featureSource.getFeatures({chr, start, end})
        assert.ok(features)
        assert.equal(128, features.length)   // feature count. Determined by grepping file
    })


    test("BED query - aliasing", async function () {

        const genome = createGenome("ncbi")
        var chr = "1",
            start = 67655271,
            end = 67684468,
            featureSource = FeatureSource({
                    format: 'bed',
                    indexed: false,
                    url: 'test/data/bed/basic_feature_3_columns.bed'
                }, genome)

        // Must get file header first
        await featureSource.getHeader()
        const features = await featureSource.getFeatures({chr, start, end})
        assert.ok(features)
        assert.equal(128, features.length)   // feature count. Determined by grepping file
    })

    test("BED track line", async function () {

        const featureSource = FeatureSource({
                format: 'bed',
                indexed: false,
                url: 'test/data/bed/basic_feature_3_columns.bed'
            },
            genome)

        const header = await featureSource.getHeader()
        assert.ok(header)
        assert.equal(header.name, "Basic Features")
        assert.equal(header.color, "255,0,0")
    })

    test("BED query gzip", async function () {

        const chr = "chr1",
            start = 67655271,
            end = 67684468,
            featureSource = FeatureSource({
                    format: 'bed',
                    url: 'test/data/bed/basic_feature_3_columns.bed.gzipped'
                },
                genome)

        const features = await featureSource.getFeatures({chr, start, end})
        assert.ok(features)
        assert.equal(128, features.length)   // feature count. Determined by grepping file
        assert.equal(chr, features[0].chr) // ensure features chromosome is specified chromosome
    })

    test("broadPeak parsing ", async function () {

        const featureSource = FeatureSource({
            format: 'broadPeak',
            url: "test/data/peak/test.broadPeak",
        }, genome)
        const chr = "chr22"
        const start = 16847690
        const end = 20009819
        const features = await featureSource.getFeatures({chr, start, end})
        assert.ok(features)
        assert.equal(features.length, 100)   // # of features over this region
        const feature = features[0]
        assert.equal(chr, feature.chr)
        assert.equal(feature.start, 16847690)
        assert.ok(feature.end > start)
        assert.equal(feature.signal, 5.141275)
    })


    test("refflat parsing ", async function () {

        const featureSource = FeatureSource({
                format: 'refflat',
                url: "test/data/bed/myc_refFlat.txt"
            },
            genome)

        const chr = "chr1"
        const start = 1
        const end = Number.MAX_VALUE
        const features = await featureSource.getFeatures({chr, start, end})
        assert.ok(features)
        assert.equal(10, features.length)   // # of features over this region
        const feature = features[0]
        assert.equal("GJA9-MYCBP", feature.name)
        assert.equal(chr, feature.chr)
        assert.equal(39328161, feature.start)
        assert.ok(feature.end > start)
        assert.equal(7, feature.exons.length)
    })


    test("genepred parsing ", async function () {

        const featureSource = FeatureSource({
                format: 'genePred',
                url: "test/data/bed/genePred_myc_hg38.txt"
            },
            genome)

        const chr = "chr8"
        const start = 1
        const end = Number.MAX_VALUE
        const features = await featureSource.getFeatures({chr, start, end})
        assert.ok(features)
        assert.equal(7, features.length)   // # of features over this region
        const feature = features[0]
        assert.equal("uc022bbe.2", feature.name)
        assert.equal(chr, feature.chr)
        assert.equal(127735433, feature.start)
        assert.ok(feature.end > start)
        assert.equal(3, feature.exons.length)
    })


    test("refgene parsing ", async function () {

        const featureSource = FeatureSource({
                format: 'refgene',
                url: "test/data/bed/myc_refGene_genePredExt.txt"
            },
            genome)

        const chr = "chr1"
        const start = 1
        const end = Number.MAX_VALUE
        const features = await featureSource.getFeatures({chr, start, end})
        assert.ok(features)
        assert.equal(10, features.length)   // # of features over this region
        const feature = features[0]
        assert.equal("GJA9-MYCBP", feature.name)
        assert.equal(chr, feature.chr)
        assert.equal(39328161, feature.start)
        assert.ok(feature.end > start)
        assert.equal(3, feature.exons.length)

    })

    test("ucsc interact", async function () {

        const featureSource = FeatureSource({
            url: "test/data/bed/ucsc_interact_1.bed"
        })

        const trackType = await featureSource.trackType()
        const header = await featureSource.getHeader()

        assert.equal(header.format, "interact")
        assert.equal(trackType, "interact")
    })

    test("Chr aliasing", async function () {

        const config = {
            format: "bed",
            url: "test/data/bed/basic_feature_3_columns.alias.bed",
        }
        const featureSource = FeatureSource(config, genome)
        const features = await featureSource.getFeatures({chr: "chr1", start: 67658429, end: 67659549})
        assert.ok(features)
        assert.equal(features.length, 4)

    })

    test("Whole genome", async function () {

        this.timeout(20000)

        // Need an actual genome object for this test, not a mock object
        const genome = await Genome.createGenome({
            id: "hg38",
            name: "Human (GRCh38/hg38)",
            fastaURL: "https://s3.dualstack.us-east-1.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg38/hg38.fa",
            indexURL: "https://s3.dualstack.us-east-1.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg38/hg38.fa.fai"
        })

        const featureSource = FeatureSource({
                format: 'refgene',
                url: "test/data/bed/myc_refGene_genePredExt.txt"
            },
            genome)

        const chr = "all"
        const features = await featureSource.getFeatures({chr})
        assert.equal(23, features.length)   // # of features over this region
    })

    test("gffTags/nameField", async function () {
        const config = {
            type: "annotation",
            format: "bed",
            delimiter: "\t",
            indexed: false,
            nameField: "Key1",
            url: "test/data/bed/gfftags.bed"
        }
        const reader = new FeatureFileReader(config)
        const features = await reader.readFeatures("chr1", 0, Number.MAX_VALUE)
        assert.ok(features)
        assert.equal(features.length, 4)
        assert.equal(features[1].name, 'terminator')
        assert.equal(features[2].name, 'M13 origin')
        assert.equal(features[3].name, 'M13 origin')
        assert.equal("Baz", features[3].getAttributeValue("Key2"))
    })

})

