import BufferedReader from "../js/bigwig/bufferedReader.js";

function runBufferedReaderTests() {

    var dataURL = "https://data.broadinstitute.org/igvdata/test/data/";

    QUnit.test("read", function(assert) {
        var done = assert.async();

        var url = dataURL + "misc/BufferedReaderTest.bin";
        var range = {start: 25, size: 100};
        var bufferedReader = new BufferedReader({url: url}, 16);

        bufferedReader.dataViewForRange(range).then(function (dataView) {

            var i;

            assert.ok(dataView);

            for (i = 0; i < range.size; i++) {
                var expectedValue = -128 + range.start + i;
                var value = dataView.getInt8(i);
                assert.equal(expectedValue, value);
            }

            done();
        }).catch(function (error) {
            console.log(error);
            assert.ok(false);
        });

    });
}

export default runBufferedReaderTests;