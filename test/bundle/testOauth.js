/**
 * Created by Jim Robinson on 9/15/2018
 *
 * Tests of the igv.oAuth object -- does not test oAuth servers or interaction with them
 */

function runOauthTests() {

    QUnit.test("Test google token", function (assert) {

        igv.oauth.setToken("foo");
        assert.equal(igv.oauth.google.access_token, "foo");
        assert.equal(igv.oauth.getToken(), "foo");

        igv.oauth.removeToken();
        assert.ok(undefined === igv.oauth.google.access_token);

        // Legacy method

        igv.setGoogleOauthToken("foo");
        assert.equal(igv.oauth.google.access_token, "foo");

    });

    QUnit.test("Test exact host", function (assert) {

        igv.oauth.setToken("foo", "host");
        assert.equal(igv.oauth.getToken("host"), "foo");

        igv.oauth.removeToken("host");
        assert.ok(undefined === igv.oauth.getToken("host"));

    });

    QUnit.test("Test wildcard host", function (assert) {

        igv.oauth.setToken("foo", "hos*");
        assert.equal(igv.oauth.getToken("host.com"), "foo");

        igv.oauth.removeToken("hos*");
        assert.ok(undefined === igv.oauth.getToken("host"));

    });


}
