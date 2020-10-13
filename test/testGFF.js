import FeatureSource from "../js/feature/featureSource.js";
import {assert} from 'chai';
import {createMockObjects} from "@igvteam/test-utils/src"

suite("testGFF", function () {

    createMockObjects();

    const genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }

    test("GFF query", async function () {

        const chr = "chr1";
        const bpStart = 1;
        const bpEnd = 10000;
        const featureSource = FeatureSource({
                url: require.resolve('./data/gff/eden.gff'),
                format: 'gff3',
                filterTypes: []
            },
            genome);

        const features = await featureSource.getFeatures({chr, bpStart, bpEnd});
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

        const chr1Features = await featureSource.getFeatures({chr: "chr1", bpStart: 500000, bpEnd: 600000});
        assert.ok(chr1Features);
        assert.equal(1, chr1Features.length);
        assert.equal(5, chr1Features[0].exons.length); // ensure features chromosome is specified chromosome

        const chr2Features = await featureSource.getFeatures({chr: "chr2", bpStart: 500000, bpEnd: 600000});
        assert.ok(chr2Features);
        assert.equal(1, chr2Features.length);
        assert.equal(5, chr2Features[0].exons.length); // ensure features chromosome is specified chromosome

    })
})
