import igvxhr from "../js/igvxhr.js";

function runIgvXhrTests() {

    var range = {start: 25, size: 100};


    function testRangeByte(arrayBuffer, assert) {

        assert.ok(arrayBuffer);

        var i;
        var dataView = new DataView(arrayBuffer);

        for (i = 0; i < range.size; i++) {

            var expectedValue = -128 + range.start + i;
            var value = dataView.getInt8(i);
            assert.equal(expectedValue, value);

        }
    }

    QUnit.test("test load", function (assert) {

        var done = assert.async();

        var url = "data/misc/BufferedReaderTest.bin";

        igvxhr.load(url,
            {
                responseType: "arraybuffer",
                range: range
            })

            .then(function (data) {
                testRangeByte(data, assert);
                done();
            });
    });

    QUnit.test("test loadArrayBuffer", function (assert) {

        var done = assert.async();

        var url = "data/misc/BufferedReaderTest.bin";

        igvxhr.loadArrayBuffer(url,
            {
                range: range
            })

            .then(function (data) {
                testRangeByte(data, assert);
                done();
            });
    });

    QUnit.test("test loadString", function (assert) {

        var done = assert.async();

        var url = "data/json/example.json";

        igvxhr.loadString(url, {})

            .then(function (result) {

                assert.ok(result);

                assert.ok(result.startsWith("{\"employees\""));

                done();
            });
    });

    QUnit.test("test loadJson", function (assert) {

        var done = assert.async();

        var url = "data/json/example.json";

        igvxhr.loadJson(url, {})

            .then(function (result) {

                assert.ok(result);

                assert.ok(result.hasOwnProperty("employees"));

                done();
            });
    });

    QUnit.test("test loadString gzipped", function (assert) {

        var done = assert.async();

        var url = "data/json/example.json.gz";

        igvxhr.loadString(url, {})

            .then(function (result) {

                assert.ok(result);

                assert.ok(result.startsWith("{\"employees\""));

                done();
            });
    });


    QUnit.test("test loadString bg-zipped", function (assert) {

        var done = assert.async();

        var url = "data/json/example.json.bgz";

        igvxhr.loadString(url, {bgz: true})

            .then(function (result) {

                assert.ok(result);

                assert.ok(result.startsWith("{\"employees\""));

                done();
            });

    });
}

export default runIgvXhrTests;
