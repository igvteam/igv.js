import "./utils/mockObjects.js"
import {assert} from 'chai'
import {describeLoadError, describeLoadFailure, explainLoadError, genomeLoadError, LoadError, sessionLoadError, trackLoadError} from "../js/util/loadFailure.js"

// A request failure, as igvxhr rejects with
function requestError(url, status, message = `Error accessing resource: ${url} status: ${status}`) {
    const error = new Error(message)
    error.status = status
    return error
}

suite("testLoadFailure", function () {

    const url = "https://example.com/genome.2bit"

    test("a request that got no response is explained, with a hint, not by its status", function () {
        const {phrase, hint} = explainLoadError(requestError(url, 0))
        assert.equal(phrase, "could not be reached")
        assert.notInclude(hint, url)
        assert.include(hint, "URL")
        assert.include(hint, "CORS")
        assert.equal(describeLoadError(requestError(url, 0)), `The file could not be reached. ${hint}`)
    })

    test("a request failure is explained by its HTTP status", function () {
        assert.deepEqual(explainLoadError(requestError(url, 404)), {phrase: "was not found (HTTP status 404)"})
        assert.deepEqual(explainLoadError(requestError(url, 401)), {phrase: "could not be accessed: unauthorized (HTTP status 401)"})
        assert.deepEqual(explainLoadError(requestError(url, 403, `Access forbidden: ${url}`)), {phrase: "could not be accessed: forbidden (HTTP status 403)"})
        assert.deepEqual(explainLoadError(requestError(url, 500)), {phrase: "could not be read: the server responded with HTTP status 500"})
        assert.deepEqual(explainLoadError(requestError(url, 0, `Timed out accessing resource: ${url}`)), {phrase: "could not be reached: the request timed out"})
        assert.deepEqual(explainLoadError(new Error("404")), {phrase: "was not found (HTTP status 404)"})
        assert.equal(describeLoadError(requestError(url, 404)), "The file was not found (HTTP status 404).")
    })

    test("any other error is explained by its message, on one line", function () {
        assert.deepEqual(explainLoadError(new Error("Not a 2bit file (bad magic number)")), {phrase: "could not be read: Not a 2bit file (bad magic number)"})
        assert.deepEqual(explainLoadError("something"), {phrase: "could not be read: something"})
        assert.deepEqual(explainLoadError(new Error("Unexpected token '>', \">chr1\nNNNN\"... is not valid JSON")),
            {phrase: "could not be read: Unexpected token '>', \">chr1 NNNN\"... is not valid JSON"})
        assert.equal(describeLoadError(new Error("Not a 2bit file (bad magic number)")), "The file could not be read: Not a 2bit file (bad magic number).")
        assert.equal(describeLoadError(new Error("It ended early.")), "The file could not be read: It ended early.")
    })

    test("a LoadError names the part and what happened to it, the resource, and a hint, one per line", function () {
        const cause = requestError(url, 0)
        const error = new LoadError('twoBit', url, cause)
        assert.instanceOf(error, Error)
        assert.equal(error.kind, 'twoBit')
        assert.equal(error.url, url)
        assert.equal(error.cause, cause)
        assert.deepEqual(error.message.split('\n'), ["The 2bit sequence file could not be reached.", url, explainLoadError(cause).hint])
    })

    test("a LoadError without a hint has two lines", function () {
        const error = new LoadError('fasta', url, requestError(url, 404))
        assert.equal(error.message, `The FASTA sequence file was not found (HTTP status 404).\n${url}`)
    })

    test("a LoadError describes a local file by its name", function () {
        const error = new LoadError('fasta', {name: "genome.fa"}, new Error("boom"))
        assert.equal(error.url, "genome.fa")
        assert.equal(error.message, "The FASTA sequence file could not be read: boom.\ngenome.fa")
    })

    test("a genome load error leads with the genome", function () {
        const cause = new LoadError('twoBit', url, requestError(url, 404))
        const error = genomeLoadError("canFam4", cause)
        assert.equal(error.cause, cause)
        assert.equal(error.message, `Genome canFam4 could not be loaded: the 2bit sequence file was not found (HTTP status 404).\n${url}`)
    })

    test("a genome load error without a genome name", function () {
        const error = genomeLoadError(undefined, new LoadError('hub', url, requestError(url, 0)))
        assert.match(error.message, /^The genome could not be loaded: the track hub file could not be reached.\n/)
    })

    test("a genome load error from any other error gives its message", function () {
        const cause = new Error("It has no chromosome to start on.")
        const error = genomeLoadError("foo", cause)
        assert.equal(error.cause, cause)
        assert.equal(error.message, "Genome foo could not be loaded.\nIt has no chromosome to start on.")
    })

    test("a track load error says what happened to the track, then its URL, without a name derived from it", function () {
        const cause = requestError("https://foo.com/b.wig", 0)
        const error = trackLoadError({url: "https://foo.com/b.wig"}, cause)
        assert.equal(error.cause.cause, cause)
        assert.deepEqual(error.message.split("\n"), [
            "The track could not be reached.",
            "https://foo.com/b.wig",
            explainLoadError(cause).hint
        ])
    })

    test("a track load error names the track by a configured name", function () {
        const error = trackLoadError({name: "My track", url: {name: "b.bed"}}, requestError("b.bed", 404))
        assert.equal(error.message, "Track My track was not found (HTTP status 404).\nb.bed")
        const fileError = trackLoadError({url: {name: "b.bed"}}, new Error("Unknown chromosome"))
        assert.equal(fileError.message, "The track could not be read: Unknown chromosome.\nb.bed")
    })

    test("a track load error keeps a reader's LoadError, which names the part that failed", function () {
        const loadError = new LoadError('index', "https://foo.com/b.bam.bai", requestError("https://foo.com/b.bam.bai", 404))
        const error = trackLoadError({url: "https://foo.com/b.bam"}, loadError)
        assert.equal(error.cause, loadError)
        assert.equal(error.message, "The track could not be loaded: the index file was not found (HTTP status 404).\nhttps://foo.com/b.bam.bai")
        const named = trackLoadError({name: "Reads", url: "https://foo.com/b.bam"}, loadError)
        assert.equal(named.message, "Track Reads could not be loaded: the index file was not found (HTTP status 404).\nhttps://foo.com/b.bam.bai")
    })

    test("a track load error without a file", function () {
        const error = trackLoadError({features: []}, new Error("boom"))
        assert.equal(error.message, "The track could not be read: boom.")
        const jsonError = trackLoadError("{not json", new SyntaxError("Unexpected token n"))
        assert.equal(jsonError.message, "The track configuration could not be read: Unexpected token n.")
    })

    test("a load failure alert describes an error by its lines", function () {
        const error = trackLoadError({url: "https://foo.com/<b>.wig"}, requestError("https://foo.com/<b>.wig", 404))
        assert.equal(describeLoadFailure(error),
            "The track was not found (HTTP status 404).<br>https://foo.com/&lt;b&gt;.wig")
        assert.equal(describeLoadFailure({url: "u", message: "m", warning: "w"}), "w<br>u<br>m")
    })

    test("a session load error says once what happened to the session file", function () {
        const error = sessionLoadError(new LoadError('session', url, requestError(url, 404)))
        assert.equal(error.message, `The session file was not found (HTTP status 404).\n${url}`)
        const hubError = sessionLoadError(new LoadError('hub', url, requestError(url, 404)))
        assert.equal(hubError.message, `The session could not be loaded: the track hub file was not found (HTTP status 404).\n${url}`)
    })
})
