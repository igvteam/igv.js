import "./utils/mockObjects.js"
import {assert} from 'chai'
import {describeLoadFailure, explainLoadError, genomeLoadError, LoadError, sessionLoadError, trackLoadError} from "../js/util/loadFailure.js"
import {loadHubGenomeConfig} from "../js/ucsc/hub/hub.js"

// A request failure, as igvxhr rejects with
function requestError(url, status) {
    const error = new Error(`Error accessing resource: ${url} status: ${status}`)
    error.status = status
    return error
}

suite("testLoadFailure", function () {

    const url = "https://example.com/genome.2bit"

    test("a request failure is explained by its status, with a hint only when there was no response", function () {
        const unreachable = explainLoadError(requestError(url, 0))
        assert.ok(unreachable.hint)
        assert.notInclude(unreachable.phrase, "status: 0")
        const notFound = explainLoadError(requestError(url, 404))
        assert.include(notFound.phrase, "404")
        assert.isUndefined(notFound.hint)
    })

    test("any other error is explained by its message, on one line", function () {
        const {phrase} = explainLoadError(new Error("Unexpected token '>', \">chr1\nNNNN\"... is not valid JSON"))
        assert.include(phrase, "is not valid JSON")
        assert.notInclude(phrase, "\n")
    })

    test("a LoadError keeps the resource, hint and cause", function () {
        const cause = requestError(url, 0)
        const error = new LoadError('twoBit', url, cause)
        assert.instanceOf(error, Error)
        assert.equal(error.kind, 'twoBit')
        assert.equal(error.url, url)
        assert.equal(error.cause, cause)
        const lines = error.message.split('\n')
        assert.include(lines, url)
        assert.include(lines, error.hint)
        assert.equal(new LoadError('fasta', {name: "genome.fa"}, new Error("boom")).url, "genome.fa")
    })

    test("genome, session and track errors wrap the LoadError and keep it as the cause", function () {
        const loadError = new LoadError('twoBit', url, requestError(url, 404))
        const genomeError = genomeLoadError("canFam4", loadError)
        assert.equal(genomeError.cause, loadError)
        assert.include(genomeError.message, "canFam4")
        assert.include(genomeError.message, url)

        assert.equal(sessionLoadError(loadError).cause, loadError)
        assert.equal(trackLoadError({url: "https://foo.com/b.bam"}, loadError).cause, loadError)

        const cause = requestError("https://foo.com/b.wig", 0)
        const trackError = trackLoadError({name: "Peaks", url: "https://foo.com/b.wig"}, cause)
        assert.instanceOf(trackError.cause, LoadError)
        assert.equal(trackError.cause.cause, cause)
        assert.include(trackError.message, "Peaks")
        assert.include(trackError.message, "https://foo.com/b.wig")
    })

    test("a load failure alert is HTML-escaped, with line breaks", function () {
        const error = trackLoadError({url: "https://foo.com/<b>.wig"}, requestError("https://foo.com/<b>.wig", 404))
        const html = describeLoadFailure(error)
        assert.include(html, "&lt;b&gt;")
        assert.notInclude(html, "<b>")
        assert.include(html, "<br>")
        assert.equal(describeLoadFailure({url: "u", message: "m", warning: "w"}), "w<br>u<br>m")
    })

    test("a load that rejects with nothing, or a track without a config, still gets a message", function () {
        assert.ok(explainLoadError(undefined).phrase)
        assert.ok(new LoadError('twoBit', url, undefined).message)
        assert.ok(trackLoadError(undefined, new Error("boom")).message)
        assert.ok(trackLoadError(undefined, undefined).message)
        assert.ok(trackLoadError("{not json", new SyntaxError("Unexpected token n")).message)
    })

    test("a hub that loads but has no such genome fails as a hub failure", async function () {
        let error
        try {
            await loadHubGenomeConfig("test/data/hubs/hub.txt", "none")
        } catch (e) {
            error = e
        }
        assert.instanceOf(error, LoadError)
        assert.equal(error.kind, "hub")
        assert.equal(error.url, "test/data/hubs/hub.txt")
    })
})
