import "./utils/mockObjects.js"
import VcfParser from "../src/igvCore/variant/vcfParser.js"
import FeatureFileReader from "../src/igvCore/feature/featureFileReader.js"
import {igvxhr} from 'igv-utils'
import {assert} from 'chai'
import getDataWrapper from "../src/igvCore/feature/dataWrapper.js"
import {createGenome} from "./utils/MockGenome.js"
import pack from "../src/igvCore/feature/featurePacker.js"
import Browser from "../src/igvCore/browser.js"
import VariantTrack from "../src/igvCore/variant/variantTrack.js"

const genome = createGenome()
const browser = {genome}

suite("testVariant", function () {

    test("Test gcvf non-ref variants", async function () {
        const url = "test/data/vcf/gvcf_non_ref.vcf"

        const data = await igvxhr.loadString(url)
        const parser = new VcfParser()

        let dataWrapper = getDataWrapper(data)
        const header = await parser.parseHeader(dataWrapper)

        dataWrapper = getDataWrapper(data)
        const variants = await parser.parseFeatures(dataWrapper)
        assert.equal(variants.length, 4)
        for (let v of variants) {
            assert.equal(v.type, "NONVARIANT")
        }
    })

    test("Test gcvf mixed variants", async function () {
        const url = "test/data/vcf/gvcf_mixed.vcf"

        const data = await igvxhr.loadString(url)
        const parser = new VcfParser()
        let dataWrapper = getDataWrapper(data)
        const header = await parser.parseHeader(dataWrapper)

        dataWrapper = getDataWrapper(data)
        const variants = await parser.parseFeatures(dataWrapper)
        assert.equal(variants.length, 5)
        for (let v of variants) {
            assert.equal(v.type, "MIXED")
            assert.ok(!v.isFiltered())
        }
    })

    test("No variants", async function () {
        const reader = new FeatureFileReader({
            format: "vcf",
            url: "test/data/vcf/NoVariantsVCF/novariants.vcf.gz",
            indexURL: "test/data/vcf/NoVariantsVCF/novariants.vcf.gz.tbi"
        })

        const features = await reader.readFeatures("chr1", 1, 1000)
        assert.equal(features.length, 0)
    })

    test("VCF parser", async function () {

        // 20	14370	rs6054257	G	A
        // 20	1110696	rs6040355	A	G,A
        // 20	1230237	.	        T  	.
        // 20	1234567	microsat1	CAG	C,CAGT
        // 20	1234575	deletion	CTA	C
        // 20	1234580	insertion	ACA	ACAT

        const url = "test/data/vcf/example.vcf"

        // Example from 4.2 spec
        const data = await igvxhr.loadString(url, {})
        const parser = new VcfParser()

        let dataWrapper = getDataWrapper(data)
        await parser.parseHeader(dataWrapper)

        dataWrapper = getDataWrapper(data)
        const featureList = await parser.parseFeatures(dataWrapper)
        const len = featureList.length
        assert.equal(8, len)   // # of features (determined by greping file)

        // Snp
        const snp = featureList[0]
        assert.equal(snp.pos, 14370)
        assert.equal(snp.start, 14369)
        assert.equal(snp.end, 14370)

        // The microsatellite
        const micro = featureList[4]
        assert.equal(micro.start, 1234567)
        assert.equal(micro.end, 1234569)
        assert.equal(2, micro.alleles.length)

        // Deletion
        const del = featureList[5]
        assert.equal(del.pos, 1234575)
        assert.equal(del.start, 1234575)
        assert.equal(del.end, 1234577)

        // Insertion
        const ins = featureList[6]
        assert.equal(ins.pos, 1234580)
        assert.equal(ins.start, 1234581.5)
        assert.equal(ins.end, 1234582.5)

    })

    test("CNV (explicit END field)", async function () {

        const url = "test/data/vcf/cnv.vcf"

        const data = await igvxhr.loadString(url, {})
        const parser = new VcfParser()
        let dataWrapper = getDataWrapper(data)
        await parser.parseHeader(dataWrapper)

        dataWrapper = getDataWrapper(data)
        const featureList = await parser.parseFeatures(dataWrapper)

        // deletion
        // 1	69091	CNVR1.1	N	<DEL>	6.95	LOWBFSCORE	CN=0;SVTYPE=DEL;END=70008;EXPECTED=31;OBSERVED=0;RATIO=0;BF=6.95	GT	1/1
        const del = featureList[0]
        assert.equal(del.pos, 69091)
        assert.equal(del.start, 69090)
        assert.equal(del.end, 70008)
        assert.ok(del.isFiltered())
    })


    //SKBR3_Sniffles_variants_tra.vcf
    test("Sniffles <TRA> records", async function () {

        const url = "test/data/vcf/SKBR3_Sniffles_variants_tra.vcf"

        const data = await igvxhr.loadString(url, {})
        const parser = new VcfParser()
        let dataWrapper = getDataWrapper(data)
        await parser.parseHeader(dataWrapper)

        dataWrapper = getDataWrapper(data)
        const featureList = await parser.parseFeatures(dataWrapper)

        // 1	564466	26582	N	<TRA>	.	PASS	PRECISE;SVMETHOD=Snifflesv1.0.2;CHR2=MT;END=3916;STD_quant_start=198.695999;STD_quant_stop=234.736235;Kurtosis_quant_start=0.913054;Kurtosis_quant_stop=-0.183504;SVTYPE=TRA;SUPTYPE=SR;SVLEN=-1199826434;STRANDS=-+;STRANDS2=2,9,2,9;RE=11	GT:DR:DV	./.:.:11
        const tra = featureList[0]
        assert.equal(tra.pos, 564466)
        assert.equal(tra.start, 564465)
        assert.equal(tra.end, 564466)
        assert.ok(!tra.isFiltered())
    })

    test("tribble indexed - large header", async function () {
        const config = {
            url: "test/data/vcf/large_header.vcf",
            indexURL: "test/data/vcf/large_header.vcf.idx"
        }

        const track = await Browser.prototype.createTrack.call(browser, config)
        assert.equal(track.type, "variant")

        const chr = "chr1"
        const start = 1
        const end = 1298832
        const features = await track.getFeatures(chr, start, end)

        assert.equal(features.length, 3)

        const attrs = track.getFilterableAttributes();
        assert.ok(attrs);
        assert.equal(Object.keys(attrs).length, 11)
        const strObj = attrs["STR"]
        assert.equal(strObj["Number"], "0")
        assert.equal(strObj["Type"], "Flag")

    })

    test("tabix indexed - large header", async function () {

        const config = {
            url: "test/data/vcf/large_header.vcf",
            indexURL: "test/data/vcf/large_header.vcf.idx"

        }

        const track = await Browser.prototype.createTrack.call(browser, config)
        assert.equal(track.type, "variant")

        const chr = "chr1"
        const start = 1
        const end = 1298832
        const features = await track.getFeatures(chr, start, end)

        assert.equal(features.length, 3)
    })

    test("parse svtype = BND ", async function () {

        const url = "test/data/vcf/svtype_BND.vcf"

        const data = await igvxhr.loadString(url, {})
        const parser = new VcfParser()
        let dataWrapper = getDataWrapper(data)
        await parser.parseHeader(dataWrapper)

        dataWrapper = getDataWrapper(data)
        const featureList = await parser.parseFeatures(dataWrapper)

        assert.equal(featureList.length, 6)
    })

    test("track svtype = BND", async function () {

        const config = {
            url: "test/data/vcf/svtype_BND.vcf",
            indexed: false
        }

        const track = await Browser.prototype.createTrack.call(browser, config)
        assert.equal(track.type, "variant")

        const chr = "chr2"
        const start = 321681
        const end = 321682
        const features = await track.getFeatures(chr, start, end)

        assert.equal(features.length, 2)

    })

    test("Packing with insertion", async function () {

        // chr14	105246530	.	G	GT	.	.	Gene=AKT1;MutationCDS=c.100G>GT;MutationAA=p.C3D
        // chr14	105246530	.	G	T	.	.	Gene=AKT1;MutationCDS=c.100C>T;MutationAA=p.A1B
        // chr14	105246530	.	GC	G	.	.	Gene=AKT1;MutationCDS=c.100GC>G;MutationAA=p.B2C
        // chr14	105246530	.	G	C	.	.	Gene=AKT1;MutationCDS=c.100G>C;MutationAA=p.D4E

        const url = "test/data/vcf/targeted_variants.vcf"

        // Example from 4.2 spec
        const data = await igvxhr.loadString(url, {})
        const parser = new VcfParser()

        let dataWrapper = getDataWrapper(data)
        await parser.parseHeader(dataWrapper)

        dataWrapper = getDataWrapper(data)
        const featureList = await parser.parseFeatures(dataWrapper)
        const len = featureList.length
        assert.equal(4, len)   // # of features (determined by greping file)


        pack(featureList, Number.MAX_SAFE_INTEGER)
        const maxRow = featureList.reduce((max, f) => Math.max(max, f.row), 0);
        assert.equal(maxRow, 2)

        assert.ok(featureList)

    })

    test("Test no info fields", async function () {

        const url = "test/data/vcf/noheader.vcf"

        const config = {url}

        const track = await Browser.prototype.createTrack.call(browser, config)

        await track.postInit()

        const variants = await track.getFeatures("chr6", 0, Number.MAX_SAFE_INTEGER)

        assert.equal(variants.length, 3)

        for (let v of variants) {
            assert.equal(v.type, "SNP")
        }

    })


})

