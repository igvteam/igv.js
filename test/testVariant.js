import VcfParser from "../js/variant/vcfParser.js"
import FeatureFileReader from "../js/feature/featureFileReader.js"
import igvxhr from "../js/igvxhr.js"
import {assert} from 'chai';
import {createMockObjects} from "@igvteam/test-utils/src"


suite("testVariant", function () {

    createMockObjects();

    test("Test gcvf non-ref variants", async function () {
        const url = require.resolve("./data/vcf/gvcf_non_ref.vcf");
        const data = await igvxhr.loadString(url)
        const parser = new VcfParser();
        const header = await parser.parseHeader(data);
        const variants = await parser.parseFeatures(data);
        assert.equal(variants.length, 4);
        for (let v of variants) {
            assert.equal(v.type, "NONVARIANT");
        }
    })

    test("Test gcvf mixed variants", async function () {
        const url = require.resolve("./data/vcf/gvcf_mixed.vcf");
        const data = await igvxhr.loadString(url)
        const parser = new VcfParser();
        const header = await parser.parseHeader(data);
        const variants = await parser.parseFeatures(data);
        assert.equal(variants.length, 5);
        for (let v of variants) {
            assert.equal(v.type, "MIXED");
        }
    })

    test("No variants", async function () {
        const reader = new FeatureFileReader({
            format: "vcf",
            url: require.resolve("./data/vcf/NoVariantsVCF/novariants.vcf.gz"),
            indexURL: require.resolve("./data/vcf/NoVariantsVCF/novariants.vcf.gz.tbi")
        })

        const features = await reader.readFeatures("chr1", 1, 1000);
        assert.equal(features.length, 0);
    })

    test("VCF parser", async function () {

        // 20	14370	rs6054257	G	A
        // 20	1110696	rs6040355	A	G,A
        // 20	1230237	.	        T  	.
        // 20	1234567	microsat1	CAG	C,CAGT
        // 20	1234575	deletion	CTA	C
        // 20	1234580	insertion	ACA	ACAT

        const url = require.resolve("./data/vcf/example.vcf");  // Example from 4.2 spec
        const data = await igvxhr.loadString(url, {});
        const parser = new VcfParser();
        parser.parseHeader(data);
        const featureList = parser.parseFeatures(data);
        const len = featureList.length;
        assert.equal(6, len);   // # of features on chr 1 (determined by greping file)

        // Snp
        const snp = featureList[0];
        assert.equal(snp.pos, 14370);
        assert.equal(snp.start, 14369);
        assert.equal(snp.end, 14370);

        // The microsatellite
        const micro = featureList[3];
        assert.equal(micro.start, 1234567);
        assert.equal(micro.end, 1234569);
        assert.equal(2, micro.alleles.length);

        // Deletion
        const del = featureList[4];
        assert.equal(del.pos, 1234575);
        assert.equal(del.start, 1234575);
        assert.equal(del.end, 1234577);

        // Insertion
        const ins = featureList[5];
        assert.equal(ins.pos, 1234580);
        assert.equal(ins.start, 1234582);
        assert.equal(ins.end, 1234582);

    })

    test("CNV (explicit END field)", async function () {

        const url = require.resolve("./data/vcf/cnv.vcf");
        const data = await igvxhr.loadString(url, {});
        const parser = new VcfParser();
        parser.parseHeader(data);
        const featureList = parser.parseFeatures(data);

        // deletion
        // 1	69091	CNVR1.1	N	<DEL>	6.95	LOWBFSCORE	CN=0;SVTYPE=DEL;END=70008;EXPECTED=31;OBSERVED=0;RATIO=0;BF=6.95	GT	1/1
        const del = featureList[0];
        assert.equal(del.pos, 69091);
        assert.equal(del.start, 69090);
        assert.equal(del.end, 70008);
    })


})

