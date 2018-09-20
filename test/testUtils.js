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


    /**
     * Parsing a uri => dictionary of parts
     */
    QUnit.test("Parse URI", function (assert) {

        const uri = "https://igv.org/app?session=foo&args=bar";

        const result = igv.parseUri(uri);

        assert.ok(result);
        assert.equal("igv.org", result.host);
        assert.equal("/app", result.path);
        assert.equal("session=foo&args=bar", result.query);
        assert.equal("https", result.protocol);


    })

    QUnit.test("Validate IP", function (assert) {

        const ip1 = "192.168.1.11";
        assert.equal(validateIP(ip1), true);

        const ip2 = "igv.org";
        assert.equal(validateIP(ip2), false);

    });


    function validateIP(address) {
        const regex = new RegExp(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
        return regex.test(address);
    }


}
