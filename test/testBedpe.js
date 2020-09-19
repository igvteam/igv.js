import FeatureSource from "../js/feature/featureSource.js";
import {assert} from 'chai';
import {setup} from "./util/setup.js";

suite("testBedpe", function () {

    setup();

    test("No header line -- column 7 score", async function () {
        const chr = "chr12";
        const bpStart = 1;
        const bpEnd = Number.MAX_SAFE_INTEGER;
        const featureSource = FeatureSource({
                url: require.resolve('./data/bedpe/GSM1872886_GM12878_CTCF_PET.bedpe.txt'),
                format: 'bedpe'
            },
            genome);

        const features = await featureSource.getFeatures(chr, bpStart, bpEnd);
        assert.ok(features);
        assert.equal(features.length, 3);

        for(let f of features) {
            assert.ok(!isNaN(f.value));
        }
    })

    test("Header line -- no pound -- column 7 score all '.'", async function () {
        const chr = "chr9";
        const bpStart = 1;
        const bpEnd = Number.MAX_SAFE_INTEGER;
        const featureSource = FeatureSource({
                url: require.resolve('./data/bedpe/hiccups_loops.bedpe'),
                format: 'bedpe'
            },
            genome);

        const features = await featureSource.getFeatures(chr, bpStart, bpEnd);
        assert.ok(features);
        assert.equal(features.length, 5)

        for(let f of features) {
            assert.ok(isNaN(f.value));
        }
    })

    test("Multiple header lines -- column 8 score", async function () {
        const chr = "chr1";
        const bpStart = 1;
        const bpEnd = Number.MAX_SAFE_INTEGER;
        const featureSource = FeatureSource({
                url: require.resolve('./data/bedpe/inter_chr_simulated.bedpe'),
                format: 'bedpe'
            },
            genome);

        const features = await featureSource.getFeatures(chr, bpStart, bpEnd);
        assert.ok(features);
        assert.equal(features.length, 5)

        for(let f of features) {
            assert.ok(f.name);
            assert.ok(!isNaN(f.value));
        }
    })

    test("10X SV", async function () {
        const chr = "chr1";
        const bpStart = 1;
        const bpEnd = Number.MAX_SAFE_INTEGER;
        const featureSource = FeatureSource({
                url: require.resolve('./data/bedpe/sv_calls.10X.bedpe'),
                format: 'bedpe'
            },
            genome);

        const features = await featureSource.getFeatures(chr, bpStart, bpEnd);
        assert.ok(features);
        assert.equal(features.length,6)
        for(let f of features) {
            assert.ok(f.name);
            assert.ok(f.value > 0);
        }
    })

    test("interact example 1", async function () {
        const chr = "chr12";
        const bpStart = 1;
        const bpEnd = Number.MAX_SAFE_INTEGER;
        const featureSource = FeatureSource({
                url: require.resolve('./data/bedpe/interactExample1.txt'),
                format: 'interact'
            },
            genome);

        const features = await featureSource.getFeatures(chr, bpStart, bpEnd);
        assert.ok(features);
        assert.equal(features.length,4)
        for(let f of features) {
            assert.ok(f.name);
            assert.equal(f.score, 0);
            assert.ok(f.value > 0);
        }
    })
})
