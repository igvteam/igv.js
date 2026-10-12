import "./utils/mockObjects.js"
import {assert} from 'chai'
import Browser from "../js/browser.js"
import FeatureSource from "../js/feature/featureSource.js"
import search from "../js/search.js"
import {LoadError} from "../js/util/loadFailure.js"

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

    suite("loadSessionFile", function () {

        async function loadError(options) {
            try {
                await Browser.loadSessionFile(options)
            } catch (e) {
                return e
            }
            assert.fail("The session loaded")
        }

        test("a session file loads", async function () {
            const session = await Browser.loadSessionFile({url: "test/data/session/igvSession.json"})
            assert.ok(session.tracks)
        })

        test("a session file that cannot be read fails with the resource", async function () {
            const error = await loadError({url: "test/data/session/missing.json"})
            assert.instanceOf(error.cause, LoadError)
            assert.equal(error.cause.kind, "session")
            assert.equal(error.cause.url, "test/data/session/missing.json")
            assert.match(error.message,
                /^The session could not be loaded: the session file could not be read: ENOENT.*\ntest\/data\/session\/missing.json$/)
        })

        test("a session file that is not JSON fails with the parse error", async function () {
            const error = await loadError({url: "test/data/twobit/foo.2bit.fa", filename: "session.json"})
            assert.equal(error.cause.kind, "session")
            assert.instanceOf(error.cause.cause, SyntaxError)
            assert.match(error.message, /^The session could not be loaded: the session file could not be read: .+JSON.\ntest\/data\/twobit\/foo.2bit.fa$/)
        })

        test("a corrupt compressed session URL is cut short in the message", async function () {
            const url = "blob:" + "x".repeat(200)
            const error = await loadError({url})
            assert.equal(error.cause.kind, "session")
            const lines = error.message.split("\n")
            assert.equal(lines[1], "blob:" + "x".repeat(55) + "\u2026")
        })

        test("a hub session whose hub cannot be read names the hub", async function () {
            const error = await loadError({url: "test/data/hubs/missing/hub.txt"})
            assert.equal(error.cause.kind, "hub")
            assert.match(error.message, /^The session could not be loaded: the track hub file could not be read: ENOENT.*\ntest\/data\/hubs\/missing\/hub.txt$/)
        })
    })
})
