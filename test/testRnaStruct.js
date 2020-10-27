import "./utils/mockObjects.js"
import RnaStructTrack from "../js/rna/rnaStruct.js";
import {assert} from 'chai';

suite("testRnaStruct", function () {

// mock brower object
    const browser = {
        // Simulate a genome with 1,2,3,... naming convention
        genome: {
            getChromosomeName: function (chr) {
                return chr.replace("chr", "");
            }
        },
        constants: {}
    };

    test('Test parsing .bp file', async function () {

        const rnaStruct = new RnaStructTrack({url: require.resolve('./data/bp/example.bp')}, browser);
        const features = await rnaStruct.getFeatures('1', 1, 100);
        assert.ok(features);
        assert.equal(features.length, 8);

    })
})