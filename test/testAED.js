import {assert} from 'chai';
import {createMockObjects} from "./util/testMockObjects"
import {createFile} from "./util/File.js";
import FeatureSource from "../js/feature/featureSource.js";
//import {XMLHttpRequest} from 'w3c-xmlhttprequest';

createMockObjects();
import { XMLHttpRequestLocal } from './util/XMLHttpRequestLocal.js';
//import {XMLHttpRequest} from 'w3c-xmlhttprequest'
global.XMLHttpRequest = XMLHttpRequestLocal;

suite("testAED", function () {

    const genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }

    test("AED - UTF8 with BOM", async function () {

        var chr = "chr2",
            bpStart = 0,
            bpEnd = Number.MAX_VALUE,
            featureSource = FeatureSource({
                    format: 'aed',
                    indexed: false,
                    url: require.resolve('./data/aed/utf8-bom.aed')
                },
                genome);

        // Must get file header first
        const features = await featureSource.getFeatures(chr, bpStart, bpEnd);

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
