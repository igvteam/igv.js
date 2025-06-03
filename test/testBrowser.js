import "./utils/mockObjects.js"
import {assert} from 'chai'
import Browser from "../src/igvCore/browser.js"
import FeatureSource from "../src/igvCore/feature/featureSource.js"
import search from "../src/igvCore/search.js"

const MockBrowser = {
    toJSON: function () {
        return JSON.parse("{}")
    }
}

suite("testBrowser", function () {

    test("compressedSession", async function () {

        const compressedSession = Browser.prototype.compressedSession.call(MockBrowser)
        assert.ok(compressedSession)

        const compressedSessionURL = "blob:" + compressedSession
        const originalJson = Browser.uncompressSession.call(MockBrowser, compressedSessionURL)
        assert.equal(originalJson, "{}")

    })
})
