import {assert} from './utils/assert.js'
import Browser from "../js/browser.js"
import FeatureSource from "../js/feature/featureSource.js"
import search from "../js/search.js"

const MockBrowser = {
    toJSON: function () {
        return JSON.parse("{}")
    }
}

describe("testBrowser", function () {

    it("compressedSession", async function () {

        const compressedSession = Browser.prototype.compressedSession.call(MockBrowser)
        assert.ok(compressedSession)

        const compressedSessionURL = "blob:" + compressedSession
        const originalJson = Browser.uncompressSession.call(MockBrowser, compressedSessionURL)
        assert.equal(originalJson, "{}")

    })
})
