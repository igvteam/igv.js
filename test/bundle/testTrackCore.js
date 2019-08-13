/**
 * Created by Jim Robinson on 9/15/2018
 */
function runCoreTests() {

    QUnit.test("Test infer track type", function (assert) {

        const config = {
            url: "http://foo/bam.cram",
            indexURL: "http://foo/bam.cram.cri"
        }

        igv.inferTrackTypes(config);

        assert.equal(config.format, "cram")
        assert.equal(config.type, "alignment")

    });



}
