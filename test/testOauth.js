import {assert} from './utils/assert.js'
import _igv from "../js/index.js"

const oauth = _igv.oauth

// Use a mock IGV object.  We need to avoid importing index.js for this test.

const igv = {
    oauth,
    setGoogleOauthToken: (accessToken) => {
        return oauth.setToken(accessToken)
    },
    setOauthToken: (accessToken, host) => {
        return oauth.setToken(accessToken, host)
    }
}
/**
 * Created by Jim Robinson on 9/15/2018
 *
 * Tests of the oauth object -- does not test oAuth servers or interaction with them
 */

describe("testOauth", function () {

    it("Test google token", function () {

        igv.oauth.setToken("foo")
        assert.equal(igv.oauth.getToken(), "foo")

        igv.oauth.removeToken()
        assert.ok(undefined === igv.oauth.getToken())

        // Legacy method
        // igv.setGoogleOauthToken("foo");
        // assert.equal(oauth.google.access_token, "foo");
    })

    it("Test exact host", function () {

        igv.setOauthToken("foo", "host")
        assert.equal(igv.oauth.getToken("host"), "foo")

        igv.oauth.removeToken("host")
        assert.ok(undefined === igv.oauth.getToken("host"))
    })

    it("Test wildcard host", function () {
        igv.setOauthToken("foo", "hos*")
        assert.equal(igv.oauth.getToken("host.com"), "foo")

        igv.oauth.removeToken("hos*")
        assert.ok(undefined === igv.oauth.getToken("host"))
    })
})