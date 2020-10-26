import {createMockObjects} from "@igvteam/test-utils/src"
import BufferedReader from "../js/bigwig/bufferedReader.js";
import {assert} from 'chai';

suite("testBigWig", function () {

    createMockObjects();

    test("read", async function() {

        const url = require.resolve('./data/misc/BufferedReaderTest.bin');
        const range = {start: 25, size: 100};
        const bufferedReader = new BufferedReader({url: url}, 16);

        const dataView = await bufferedReader.dataViewForRange(range);
            assert.ok(dataView);
            for (let i = 0; i < range.size; i++) {
                var expectedValue = -128 + range.start + i;
                var value = dataView.getInt8(i);
                assert.equal(expectedValue, value);
            }
    })
})
