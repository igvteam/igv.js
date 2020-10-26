import {createMockObjects} from "@igvteam/test-utils/src"
import FeatureSource from "../js/feature/featureSource.js";
import {assert} from 'chai';

suite("testWig", function () {

    createMockObjects();

    const genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }

    test("wig fixed step", async function () {

        const path = require.resolve("./data/wig/fixedStep-example.wig"),
            featureSource = FeatureSource(
                {format: 'wig', url: path},
                genome),
            chr = "chr19",
            start = 49300000,
            end = 49400000;

        const features = await featureSource.getFeatures({chr, start, end});
        assert.equal(features.length, 10);
        //fixedStep chrom=chr19 start=49307401 step=300 span=200
        // fixedStep uses 1-based coordinate, igv.js uses 0-based
        assert.equal(features[0].start, 49307400);
        assert.equal(features[0].end - features[0].start, 200);
        assert.equal(features[1].start - features[0].start, 300);
    })

    test("wig variable step", async function () {

        const url = require.resolve("./data/wig/variableStep-example.wig");
        const wigFeatureSource = FeatureSource(
            {format: 'wig', url: url},
            genome);
        //variableStep chrom=chr19 span=150
        const wigStarts = [49304701, 49304901, 49305401, 49305601, 49305901, 49306081, 49306301, 49306691, 49307871];
        const values = [10.0, 12.5, 15.0, 17.5, 20.0, 17.5, 15.0, 12.5, 10.0];
        const span = 150;

        const chr = "chr19";
        const start = 49304200;
        const end = 49310700;

        const features = await wigFeatureSource.getFeatures({chr, start, end});
        assert.equal(features.length, 9);
        //fixedStep chrom=chr19 start=49307401 step=300 span=200
        features.forEach(function (feature, index) {
            assert.equal(feature.start, wigStarts[index] - 1);
            assert.equal(feature.end, wigStarts[index] - 1 + span);
            assert.equal(feature.value, values[index]);

        })
    })
})