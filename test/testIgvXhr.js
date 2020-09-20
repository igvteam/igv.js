import igvxhr from "../js/igvxhr.js";
import {assert} from 'chai';
import {createMockObjects} from "@igvteam/test-utils/src"

suite("testIgvXhr", function () {

    createMockObjects();

    const range = {start: 25, size: 100};

    function verifyBytes(arrayBuffer) {
        assert.ok(arrayBuffer);
        var dataView = new DataView(arrayBuffer);
        for (let i = 0; i < range.size; i++) {
            var expectedValue = -128 + range.start + i;
            var value = dataView.getInt8(i);
            assert.equal(expectedValue, value);
        }
    }

    test("test load", async function () {
        const url = require.resolve("./data/misc/BufferedReaderTest.bin");
        const data = await igvxhr.load(url,
            {
                responseType: "arraybuffer",
                range: range
            });
        verifyBytes(data, assert);
    })

    test("test loadArrayBuffer", async function () {
        const url = require.resolve("./data/misc/BufferedReaderTest.bin");
        const data = await igvxhr.loadArrayBuffer(url,
            {
                range: range
            });
        verifyBytes(data, assert);
    });

    test("test loadString", async function () {
        const url = require.resolve("./data/json/example.json");
        const result = await igvxhr.loadString(url, {});
        assert.ok(result);
        assert.ok(result.startsWith("{\"employees\""));
    })

    test("test loadJson", async function () {
        const url = require.resolve("./data/json/example.json");
        const result = await igvxhr.loadJson(url, {});
        assert.ok(result);
        assert.ok(result.hasOwnProperty("employees"));
    })

    test("test loadString gzipped", async function () {
        const url = require.resolve("./data/json/example.json.gz");
        const result = await igvxhr.loadString(url, {});
        assert.ok(result);
        assert.ok(result.startsWith("{\"employees\""));

    })


    test("test loadString bg-zipped", async function () {
        const url = require.resolve("./data/json/example.json.bgz");
        const result = await igvxhr.loadString(url, {});
        assert.ok(result);
        assert.ok(result.startsWith("{\"employees\""));


    })
})
