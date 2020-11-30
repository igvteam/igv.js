import "./utils/mockObjects.js";
import {createFile} from "./utils/File.js"
import FeatureSource from "../js/feature/featureSource.js";
import {assert} from 'chai';
import {genome} from "./utils/Genome.js";

suite("testAED", function () {

    test("AED - UTF8 with BOM", async function () {

        var chr = "chr2",
            start = 0,
            end = Number.MAX_VALUE,
            featureSource = FeatureSource({
                    format: 'aed',
                    indexed: false,
                    url: createFile(require.resolve('./data/aed/utf8-bom.aed'))
                },
                genome);

        // Must get file header first
        const features = await featureSource.getFeatures({chr, start, end});

        assert.equal(features.length, 1);

        assert.equal(features[0].aed.metadata.affx.ucscGenomeVersion.value, "hg19");
        assert.equal(features[0].aed.columns[14].name, "note");

        assert.equal(features[0].name, "CNNM3");
        assert.equal(features[0].cdStart, null); // Missing value
        assert.equal(features[0].allColumns[14], "Test unicode:\r" +
            "∞\r" +
            "☃\r" +
            "(infinity snowman)");
        assert.equal(features[0].strand, "+");

    })
})
