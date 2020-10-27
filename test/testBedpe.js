import {createMockObjects} from "./utils/index.js"
import FeatureSource from "../js/feature/featureSource.js";
import FeatureFileReader from "../js/feature/featureFileReader.js";
import {assert} from 'chai';

suite("testBedpe", function () {

    createMockObjects();

    const genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }

    test("No header line -- column 7 score", async function () {
        const chr = "chr12";
        const start = 1;
        const end = Number.MAX_SAFE_INTEGER;
        const featureSource = FeatureSource({
                url: require.resolve('./data/bedpe/GSM1872886_GM12878_CTCF_PET.bedpe.txt'),
                format: 'bedpe'
            },
            genome);

        const features = await featureSource.getFeatures({chr, start, end});
        assert.ok(features);
        assert.equal(features.length, 3);

        for(let f of features) {
            assert.ok(!isNaN(f.score));
        }
    })

    test("Header line -- no pound -- column 7 score all '.'", async function () {
        const chr = "chr9";
        const start = 1;
        const end = Number.MAX_SAFE_INTEGER;
        const featureSource = FeatureSource({
                url: require.resolve('./data/bedpe/hiccups_loops.bedpe'),
                format: 'bedpe'
            },
            genome);

        const features = await featureSource.getFeatures({chr, start, end});
        assert.ok(features);
        assert.equal(features.length, 5)

        for(let f of features) {
            assert.ok(isNaN(f.value));
        }
    })

    test("Multiple header lines -- column 8 score", async function () {
        const chr = "chr1";
        const start = 1;
        const end = Number.MAX_SAFE_INTEGER;
        const featureSource = FeatureSource({
                url: require.resolve('./data/bedpe/inter_chr_simulated.bedpe'),
                format: 'bedpe'
            },
            genome);

        const features = await featureSource.getFeatures({chr, start, end});
        assert.ok(features);
        assert.equal(features.length, 11)

        for(let f of features) {
            assert.ok(f.name);
            assert.ok(!isNaN(f.score));
        }
    })

    test("10X SV", async function () {
        const chr = "chr1";
        const start = 1;
        const end = Number.MAX_SAFE_INTEGER;
        const featureSource = FeatureSource({
                url: require.resolve('./data/bedpe/sv_calls.10X.bedpe'),
                format: 'bedpe'
            },
            genome);

        const features = await featureSource.getFeatures({chr, start, end});
        assert.ok(features);
        assert.equal(features.length,6)
        for(let f of features) {
            assert.ok(f.name);
            assert.ok(f.score > 0);
        }
    })


    test("10X Large SVs", async function () {
        const chr = "chr1";
        const start = 1;
        const end = Number.MAX_SAFE_INTEGER;
        const featureSource = FeatureSource({
                url: require.resolve('./data/bedpe/large_sv_calls.10X.bedpe'),
                format: 'bedpe'
            },
            genome);

        const features = await featureSource.getFeatures({chr, start, end});
        assert.ok(features);
        assert.equal(features.length,2)

        const extras = features[0].extras;
        assert.equal(extras.length, 2);
    })

    test("Inter chr", async function() {

        const reader = new FeatureFileReader({
            format: 'bedpe',
            url: require.resolve('./data/bedpe/inter_chr_simulated.bedpe')
        });

        const features = await reader.loadFeaturesNoIndex();
        assert.equal(features.length, 17);   // 5 intra + 6 (x2) inter

        // Test complementary trvotfd
        const chr1Y = features.filter(f => f.chr1 === "chr1" && f.chr2 === "chrY");
        assert.equal(chr1Y.length, 2);
        if(chr1Y[0].chr === "chr1") {
            assert.equal(chr1Y[1].chr, "chrY")
        } else {
            assert.equal(chr1Y[0].chr, "chrY")
        }

    })

    test("interact example 1", async function () {
        const chr = "chr12";
        const start = 1;
        const end = Number.MAX_SAFE_INTEGER;
        const featureSource = FeatureSource({
                url: require.resolve('./data/bedpe/interactExample1.txt'),
                format: 'interact'
            },
            genome);

        const features = await featureSource.getFeatures({chr, start, end});
        assert.ok(features);
        assert.equal(features.length,4)
        for(let f of features) {
            assert.ok(f.name);
            assert.equal(f.score, 0);
            assert.ok(f.value > 0);
        }
    })


    test("hiccups (old format)", async function () {
        const chr = "chr1";
        const start = 1;
        const end = Number.MAX_SAFE_INTEGER;
        const featureSource = FeatureSource({
                url: require.resolve('./data/bedpe/sv_calls.10X.bedpe'),
                format: 'bedpe'
            },
            genome);

        const features = await featureSource.getFeatures({chr, start, end});
        assert.ok(features);
        assert.equal(features.length,6)
        for(let f of features) {
            assert.ok(f.name);
            assert.ok(f.score > 0);
        }
    })
})
