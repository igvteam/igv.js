import "./utils/mockObjects.js"
import loadPlinkFile from "../js/sample/sampleInformation.js"
import {assert} from 'chai'

suite("testRnaStruct", function () {

    test('Load Plink', async function () {
        const sampleInformation = await loadPlinkFile('test/data/misc/pedigree.fam')

        const attributes = sampleInformation.getAttributes('SS0012979')
        assert.ok(attributes)
        assert.equal(attributes.familyId, "14109")
    })
})