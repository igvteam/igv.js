import "./utils/mockObjects.js"
import {assert} from 'chai'
import {describeLoadError, genomeLoadError, LoadError} from "../js/util/loadFailure.js"

// A request failure, as igvxhr rejects with
function requestError(url, status, message = `Error accessing resource: ${url} status: ${status}`) {
    const error = new Error(message)
    error.status = status
    return error
}

suite("testLoadFailure", function () {

    const url = "https://example.com/genome.2bit"

    test("a request that got no response is described, not its status", function () {
        const description = describeLoadError(requestError(url, 0))
        assert.notInclude(description, url)
        assert.notInclude(description, "status: 0")
        assert.include(description, "could not be reached")
        assert.include(description, "URL")
        assert.include(description, "CORS")
    })

    test("a request failure is described by its HTTP status", function () {
        assert.equal(describeLoadError(requestError(url, 404)), "Not found (HTTP status 404).")
        assert.equal(describeLoadError(requestError(url, 401)), "Access unauthorized (HTTP status 401).")
        assert.equal(describeLoadError(requestError(url, 500)), "The server responded with HTTP status 500.")
        assert.equal(describeLoadError(requestError(url, 0, `Timed out accessing resource: ${url}`)), "The request timed out.")
        assert.equal(describeLoadError(requestError(url, 403, `Access forbidden: ${url}`)), "Access forbidden (HTTP status 403).")
    })

    test("other errors are described by their message", function () {
        assert.equal(describeLoadError(new Error("Not a 2bit file (bad magic number)")), "Not a 2bit file (bad magic number)")
        assert.equal(describeLoadError(new Error("404")), "Not found")
        assert.equal(describeLoadError("something"), "something")
        assert.equal(describeLoadError(new Error("Unexpected token '>', \">chr1\nNNNN\"... is not valid JSON")),
            "Unexpected token '>', \">chr1 NNNN\"... is not valid JSON")
    })

    test("a LoadError names the part, the resource, and the error, one per line", function () {
        const cause = requestError(url, 0)
        const error = new LoadError('twoBit', url, cause)
        assert.instanceOf(error, Error)
        assert.equal(error.kind, 'twoBit')
        assert.equal(error.url, url)
        assert.equal(error.cause, cause)
        const lines = error.message.split('\n')
        assert.equal(lines.length, 3)
        assert.equal(lines[0], "The 2bit sequence file could not be read.")
        assert.equal(lines[1], url)
        assert.equal(lines[2], describeLoadError(cause))
    })

    test("a LoadError describes a local file by its name", function () {
        const error = new LoadError('fasta', {name: "genome.fa"}, new Error("boom"))
        assert.equal(error.url, "genome.fa")
        assert.equal(error.message, "The FASTA sequence file could not be read.\ngenome.fa\nboom")
    })

    test("a genome load error leads with the genome", function () {
        const cause = new LoadError('twoBit', url, requestError(url, 404))
        const error = genomeLoadError("canFam4", cause)
        assert.equal(error.cause, cause)
        assert.equal(error.message,
            `Genome canFam4 could not be loaded: the 2bit sequence file could not be read.\n${url}\nNot found (HTTP status 404).`)
    })

    test("a genome load error without a genome name", function () {
        const error = genomeLoadError(undefined, new LoadError('hub', url, requestError(url, 0)))
        assert.match(error.message, /^The genome could not be loaded: the track hub file could not be read.\n/)
    })

    test("a genome load error from any other error gives its message", function () {
        const cause = new Error("It has no chromosome to start on.")
        const error = genomeLoadError("foo", cause)
        assert.equal(error.cause, cause)
        assert.equal(error.message, "Genome foo could not be loaded.\nIt has no chromosome to start on.")
    })
})
