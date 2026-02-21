import RnaStructTrack from "../js/rna/rnaStruct.js"
import {assert} from './utils/assert.js'
import {createGenome} from "./utils/MockGenome.js"

// Mock genome object
const genome = createGenome("ncbi")
describe("testRnaStruct", function () {

// mock brower object
    const browser = {
        genome,
        constants: {}
    }

    it('Test parsing .bp file', async function () {

        const rnaStruct = new RnaStructTrack(
            {url: 'test/data/bp/example.bp'},
            browser
        )

        const features = await rnaStruct.getFeatures('1', 1, 100)
        assert.ok(features)
        assert.equal(features.length, 8)
    })

})