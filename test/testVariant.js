import {createGAVariant} from "../js/variant/variant.js";
import VcfParser from "../js/variant/vcfParser.js"
import igvxhr from "../js/igvxhr.js"

function runVariantTests() {

    // Mock objects
    const genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }

    QUnit.test("Test ref block", function (assert) {
        var done = assert.async();
        var json = '{"referenceName": "7","start": "117242130","end": "117242918","referenceBases": "T","alternateBases": ["\u003cNON_REF\u003e"]}';
        var obj = JSON.parse(json);
        var variant = createGAVariant(obj);
        assert.ok(variant.isRefBlock());
        done();
    });

    QUnit.test("Test insertion", function (assert) {
        var done = assert.async();
        var json = '{"referenceName": "7","start": "117242918","end": "117242919","referenceBases": "T","alternateBases": ["TA"]}';
        var obj = JSON.parse(json);
        var variant = createGAVariant(obj);
        assert.ok(variant.isRefBlock() === false);
        assert.equal(117242919, variant.start);
        done();
    });

    QUnit.test("Test deletion", function (assert) {
        var done = assert.async();
        var json = '{"referenceName": "7","start": "117242918","end": "117242920","referenceBases": "TA","alternateBases": ["T"]}';
        var obj = JSON.parse(json);
        var variant = createGAVariant(obj);
        assert.ok(variant.isRefBlock() === false);
        assert.equal(117242919, variant.start);
        done();
    });

    QUnit.test("Test gcvf mixed variants", async function (assert) {

        const url = "data/vcf/gvcf_mixed.vcf";
        const data = await igvxhr.loadString(url)
        const parser = new VcfParser();
        const header = await parser.parseHeader(data);
        const variants = await parser.parseFeatures(data);
        assert.equal(variants.length, 5);
    });

    QUnit.test("Test gcvf non-ref variants", async function (assert) {

        const url = "data/vcf/gvcf_non_ref.vcf";
        const data = await igvxhr.loadString(url)
        const parser = new VcfParser();
        const header = await parser.parseHeader(data);
        const variants = await parser.parseFeatures(data);
        assert.equal(variants.length, 4);
    });
}

export default runVariantTests;
