import VcfParser from "../js/variant/vcfParser.js"
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
        for(let v of variants) {
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
        for(let v of variants) {
            assert.equal(v.type, "MIXED");
        }
    })
})

