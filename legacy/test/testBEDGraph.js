import "./utils/mockObjects.js"
import FeatureSource from "../js/feature/featureSource.js"
import {assert} from 'chai'
import {createGenome} from "./utils/MockGenome.js"


suite("testBedGraph", function () {

    const genome = createGenome()

    test("bedgraph getFeatures", async function () {

        var chr = "chr19",
            start = 49302001,
            end = 49304701,
            featureSource = FeatureSource({
                    format: 'bedgraph',
                    url: 'test/data/wig/bedgraph-example-uscs.bedgraph'
                },
                genome
            )


        const features = await featureSource.getFeatures({chr, start, end})
        assert.ok(features)
        assert.equal(features.length, 9)

        //chr19	49302600	49302900	-0.50
        var f = features[2]
        assert.equal(f.chr, "chr19", "chromosome")
        assert.equal(f.start, 49302600, "start")
        assert.equal(f.end, 49302900, "end")
        assert.equal(f.value, -0.50, "value")
    })

    test("bedgraph getFeatures - aliasing", async function () {

        const genome = createGenome("ncbi")
        var chr = "19",
            start = 49302001,
            end = 49304701,
            featureSource = FeatureSource({
                    format: 'bedgraph',
                    url: 'test/data/wig/bedgraph-example-uscs.bedgraph'
                },
                genome
            )


        const features = await featureSource.getFeatures({chr, start, end})
        assert.ok(features)
        assert.equal(features.length, 9)

        //chr19	49302600	49302900	-0.50
        var f = features[2]
        assert.equal(f.chr, "chr19", "chromosome")
        assert.equal(f.start, 49302600, "start")
        assert.equal(f.end, 49302900, "end")
        assert.equal(f.value, -0.50, "value")
    })
})


