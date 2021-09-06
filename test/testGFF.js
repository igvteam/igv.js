import "./utils/mockObjects.js"
import FeatureSource from "../js/feature/featureSource.js";
import FeatureFileReader from "../js/feature/featureFileReader.js";
import {assert} from 'chai';
import {genome} from "./utils/Genome.js";
import GFFHelper from "../js/feature/gff/gffHelper.js";
import {parseAttributeString} from "../js/feature/gff/gff.js";

suite("testGFF", function () {

    test("Eden GFF", async function () {

        const chr = "chr1";
        const start = 1;
        const end = 10000;
        const featureReader = new FeatureFileReader({
                url: require.resolve('./data/gff/eden.gff'),
                format: 'gff3',
                filterTypes: []
            },
            genome);

        // Fetch "raw" features (constituitive parts)
        const features = await featureReader.readFeatures(chr, start, end);
        assert.ok(features);
        assert.equal(20, features.length);

        // Combine features
        const helper = new GFFHelper({format: "gff3"});
        const combinedFeatures = helper.combineFeatures(features);
        assert.equal(4, combinedFeatures.length);

        // Check last transcript
        /*
mRNA	1300	9000	.	+	.	 ID=mRNA00003;Parent=gene00001;Name=EDEN.3
exon	1300	1500	.	+	.	 ID=exon00001;Parent=mRNA00003
exon	3000	3902	.	+	.	 ID=exon00003;Parent=mRNA00001,mRNA00003
exon	5000	5500	.	+	.	 ID=exon00004;Parent=mRNA00001,mRNA00002,mRNA00003
exon	7000	9000	.	+	.	 ID=exon00005;Parent=mRNA00001,mRNA00002,mRNA00003
CDS	    3301	3902	.	+	0	ID=cds00003;Parent=mRNA00003;Name=edenprotein.3
CDS	    5000	5500	.	+	1	ID=cds00003;Parent=mRNA00003;Name=edenprotein.3
CDS	    7000	7600	.	+	1	ID=cds00003;Parent=mRNA00003;Name=edenprotein.3
         */
        const mRNA3 = combinedFeatures[3];
        assert.equal(mRNA3.name, "EDEN.3");
        assert.equal(mRNA3.exons.length, 4);
        assert.equal(mRNA3.exons[0].utr, true);
        assert.equal(mRNA3.exons[1].cdStart, 3300);
        assert.equal(mRNA3.exons[3].cdEnd, 7600);
    })

    test("ENSEMBL GFF transcript", async function () {

        const featureReader = new FeatureFileReader({
                url: require.resolve('./data/gff/Ensembl_MYC-205.gff3'),
                format: 'gff3',
                filterTypes: []
            },
            genome);

        // Fetch "raw" features (constituitive parts)
        const features = await featureReader.readFeatures();
        assert.ok(features);
        assert.equal(9, features.length);

        // Combine features
        const helper = new GFFHelper({format: "gff3"});
        const combinedFeatures = helper.combineFeatures(features);
        assert.equal(1, combinedFeatures.length);
        assert.equal(3, combinedFeatures[0].exons.length);
    })

    test("ENSEMBL GFF region", async function () {

        const featureReader = new FeatureFileReader({
                url: require.resolve('./data/gff/Ensembl_MYC-region.gff3'),
                format: 'gff3',
                filterTypes: []
            },
            genome);

        // Fetch "raw" features (constituitive parts)
        const features = await featureReader.readFeatures();
        assert.ok(features);
        assert.equal(76, features.length);

        // Combine features
        const helper = new GFFHelper({format: "gff3"});
        const combinedFeatures = helper.combineFeatures(features);

        // 9 mRNAs, 11 biological regions
        assert.equal(20, combinedFeatures.length);
        assert.equal(9, combinedFeatures.filter(f => f.type === "mRNA").length);

    })

    test("NCBI GTF", async function () {


        const featureReader = new FeatureFileReader({
                url: require.resolve('./data/gff/NCBI_hg38_MYC.gtf'),
                format: 'gtf',
                filterTypes: []
            },
            genome);

        // Fetch "raw" features (constituitive parts)
        const features = await featureReader.readFeatures();
        assert.ok(features);
        assert.equal(19, features.length);

        // Combine features
        const helper = new GFFHelper({format: "gtf"});
        const combinedFeatures = helper.combineFeatures(features);
        assert.equal(2, combinedFeatures.length);

        const transcript1 = combinedFeatures[0];
        const attributes = parseAttributeString(transcript1.attributeString, transcript1.delim);
        assert.equal(attributes['product'], 'MYC proto-oncogene, bHLH transcription factor, transcript variant 2')
    })

    test("gencode lincRNA gtf", async function () {

        const featureReader = new FeatureFileReader({
                url: require.resolve('./data/gff/gencode-lincRNA.gtf'),
                format: 'gtf',
                filterTypes: []
            },
            genome);

        // Fetch "raw" features (constituitive parts)
        const features = await featureReader.readFeatures();
        assert.ok(features);
        assert.equal(10, features.length);

        // Combine features
        const helper = new GFFHelper({format: "gtf"});
        const combinedFeatures = helper.combineFeatures(features);
        assert.equal(2, combinedFeatures.length);
        assert.equal(3, combinedFeatures[0].exons.length);
        assert.equal(3, combinedFeatures[0].exons.length);
    })

    test("Ensembl transcript gtf", async function () {

        const featureReader = new FeatureFileReader({
                url: require.resolve('./data/gff/Ensembl-transcript.gtf'),
                format: 'gtf',
                filterTypes: []
            },
            genome);

        // Fetch "raw" features (constituitive parts)
        const features = await featureReader.readFeatures();
        assert.ok(features);
        assert.equal(7, features.length);

        // Combine features
        const helper = new GFFHelper({format: "gtf"});
        const combinedFeatures = helper.combineFeatures(features);
        assert.equal(1, combinedFeatures.length);
        assert.equal(2, combinedFeatures[0].exons.length);

        // Test coding start/stop
        // -------------------------
        // exon	30663971	30664080
        // CDS	30663971	30664003
        // start_codon	30664001	30664003
        // UTR	30664004	30664080
        // --------------------------
        // exon	30666807	30667353
        // UTR	30666807	30667353

        const firstExon = combinedFeatures[0].exons[0];
        assert.equal(firstExon.cdStart, 30663971 - 1);
        assert.equal(firstExon.cdEnd, 30664003);

        const secondExon = combinedFeatures[0].exons[1];
        assert.equal(secondExon.utr, true);   // Entire exon is UTR

    })

    test("washU gtf", async function () {

        const featureReader = new FeatureFileReader({
                url: require.resolve('./data/gff/wustl.gtf'),
                format: 'gtf',
                filterTypes: []
            },
            genome);

        // Fetch "raw" features (constituitive parts)
        const features = await featureReader.readFeatures();
        assert.ok(features);
        assert.equal(24, features.length);

        // Combine features
        const helper = new GFFHelper({format: "gtf"});
        const combinedFeatures = helper.combineFeatures(features);
        assert.equal(5, combinedFeatures.length);
        assert.equal(5, combinedFeatures[0].exons.length);


        // Check second transcript

/*
3UTR	    65149	65487

3UTR	    66823	66992
stop_codon	66993	66995
CDS	        66996	66999

CDS	        70207	70294

CDS	        71696	71807
start_codon	71805	71806

start_codon	73222	73222
CDS	        73222	73222
5UTR	    73223	73504
 */

        const t2 = combinedFeatures[4];
        assert.equal(t2.cdStart, 66992);   // By convention leftmost end of CDS, not 5', and IGV includes stop codon
        assert.equal(t2.cdEnd, 73222);

        assert.equal(5, t2.exons.length);
        assert.equal(t2.exons[0].utr, true);
        assert.equal(t2.exons[1].cdStart, 66992);
        assert.equal(t2.exons[4].cdEnd, 73222);

    })


    test("GFF query", async function () {

        const chr = "chr1";
        const start = 0;
        const end = Number.MAX_SAFE_INTEGER;
        const featureSource = FeatureSource({
                url: require.resolve('./data/gff/eden.gff'),
                format: 'gff3',
                filterTypes: []
            },
            genome);

        const features = await featureSource.getFeatures({chr, start, end});
        assert.ok(features);
        assert.equal(4, features.length);
        assert.equal(chr, features[0].chr); // ensure features chromosome is specified chromosome

    })

    test("Multiline feature", async function () {

        const featureSource = FeatureSource({
                url: require.resolve('./data/gff/multi_line_feature.gff3'),
                format: 'gff3'
            },
            genome);

        const chr1Features = await featureSource.getFeatures({chr: "chr1", start: 500000, end: 600000});
        assert.ok(chr1Features);
        assert.equal(1, chr1Features.length);
        assert.equal(5, chr1Features[0].exons.length); // ensure features chromosome is specified chromosome

        const chr2Features = await featureSource.getFeatures({chr: "chr2", start: 500000, end: 600000});
        assert.ok(chr2Features);
        assert.equal(1, chr2Features.length);
        assert.equal(5, chr2Features[0].exons.length); // ensure features chromosome is specified chromosome

    })
})
