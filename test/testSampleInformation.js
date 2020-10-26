import {createMockObjects} from "@igvteam/test-utils/src"
import loadPlinkFile from "../js/sampleInformation.js";
import {assert} from 'chai';

suite("testRnaStruct", function () {

    createMockObjects();

    test('Load Plink', async function () {
        const sampleInformation = await loadPlinkFile(require.resolve('./data/misc/pedigree.fam'));
        const attributes = sampleInformation.getAttributes('SS0012979');
        assert.ok(attributes);
        assert.equal(attributes.familyId, "14109");
    })
})