import FeatureSource from "../js/feature/featureSource.js";
import {assert} from 'chai';
import {setup} from "./util/setup.js";

suite("testBedGraph", function () {

    setup();

    test("BEDGraphFeatureSource getFeatures", async function () {


        var chr = "chr19",
            bpStart = 49302001,
            bpEnd = 49304701,
            featureSource = FeatureSource({
                    format: 'bedgraph',
                    url: require.resolve('./data/wig/bedgraph-example-uscs.bedgraph')
                },
                genome);

        const features = await featureSource.getFeatures(chr, bpStart, bpEnd);
        assert.ok(features);
        assert.equal(features.length, 9);

        //chr19	49302600	49302900	-0.50
        var f = features[2];
        assert.equal(f.chr, "chr19", "chromosome");
        assert.equal(f.start, 49302600, "start");
        assert.equal(f.end, 49302900, "end");
        assert.equal(f.value, -0.50, "value");
    })
})


