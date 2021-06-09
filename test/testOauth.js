import "./utils/mockObjects.js"
import igv from "../js/index.js";
import {assert} from 'chai';

/**
 * Created by Jim Robinson on 9/15/2018
 *
 * Tests of the oauth object -- does not test oAuth servers or interaction with them
 */

suite("testOauth", function () {

    test("Test google token", function () {

        igv.oauth.setToken("foo");
        assert.equal(igv.oauth.google.access_token, "foo");
        assert.equal(igv.oauth.getToken(), "foo");

        igv.oauth.removeToken();
        assert.ok(undefined === igv.oauth.google.access_token);

        // Legacy method
        // igv.setGoogleOauthToken("foo");
        // assert.equal(oauth.google.access_token, "foo");
    })

    test("Test exact host", function () {

        igv.oauth.setToken("foo", "host");
        assert.equal(igv.oauth.getToken("host"), "foo");

        igv.oauth.removeToken("host");
        assert.ok(undefined === igv.oauth.getToken("host"));
    })

    test("Test wildcard host", function () {
        igv.oauth.setToken("foo", "hos*");
        assert.equal(igv.oauth.getToken("host.com"), "foo");

        igv.oauth.removeToken("hos*");
        assert.ok(undefined === igv.oauth.getToken("host"));
    })
})