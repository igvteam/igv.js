/**
 * Created by Jim Robinson on 9/15/2018
 */
function runUtilTests() {

    QUnit.test("Test locus parsing 1", function (assert) {

        const locus = "chr1:101-200";

        const range = igv.parseLocusString(locus);

        assert.equal(range.chr, "chr1");
        assert.equal(range.start, 100);
        assert.equal(range.end, 200);

    });

    QUnit.test("Test locus parsing 2", function (assert) {

        const locus = "chr1:101";

        const range = igv.parseLocusString(locus);

        assert.equal(range.chr, "chr1");
        assert.equal(range.start, 100);
        assert.equal(range.end, 101);

    });


    /**
     * Test adding "raw" html to menu.
     */
    QUnit.test("Track menu helper", function (assert) {
        const itemList = ['<hr/>'];
        const result = igv.trackMenuItemListHelper(itemList);
        assert.equal(result.length, 1);
    });


}
