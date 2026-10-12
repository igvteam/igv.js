const httpMessages = {
    "401": "Access unauthorized",
    "403": "Access forbidden",
    "404": "Not found"
}

// A request that got no response: the browser reports status 0 for a network error, a blocked cross-origin request,
// and a response the server sent without CORS headers (an error page, for a wrong URL, often has none)
const unreachableMessage =
    "The file could not be reached. Check that the URL is correct. The server may also be down, or may not allow " +
    "access from this web page (CORS)."

/**
 * Describe the error a load failed with, for the user.  A request failure (from igvxhr, which gives it a numeric
 * status) is described by its HTTP status, as its own message repeats the URL; any other error by its message.
 */
function describeLoadError(error) {
    const msg = error.message || error.error || error.toString()
    if (httpMessages.hasOwnProperty(msg)) {
        return httpMessages[msg]
    }
    if (typeof error.status === 'number') {
        const status = error.status
        if (status === 0) {
            return msg.startsWith("Timed out") ? "The request timed out." : unreachableMessage
        }
        return httpMessages.hasOwnProperty(status) ?
            `${httpMessages[status]} (HTTP status ${status}).` :
            `The server responded with HTTP status ${status}.`
    }
    return msg
}

function describeResource(url) {
    return url?.name ?? String(url)   // A local File, or a URL
}

function escapeHTML(string) {
    return String(string)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
}

/**
 * A load failure, as reported in the browser's load-failure alert.
 *
 * @param kind  What failed to load, e.g. 'track' or 'chromAlias'
 * @param url  The resource that failed
 * @param error  The error the load failed with
 * @param warning  Optional, for an optional part: what failed and its likely consequence, e.g. "Cytobands could not
 *                 be loaded, so ..."
 */
function loadFailure(kind, url, error, warning) {
    return {kind, url: describeResource(url), message: describeLoadError(error.cause || error), warning}
}

/**
 * Describe a load failure for an alert: its warning, if any, then the resource and the error, one per line.
 *
 * @param loadFailure  {kind, url, message, warning}, from loadFailure()
 * @returns {string}  HTML
 */
function describeLoadFailure({url, message, warning}) {
    return [warning, url, message].filter(line => line !== undefined).map(escapeHTML).join('<br>')
}

// What each kind of required part is called in a message to the user
const partNames = {
    twoBit: "2bit sequence file",
    fasta: "FASTA sequence file",
    fastaIndex: "FASTA index (.fai) file",
    chromSizes: "chromosome sizes file",
    genbank: "GenBank file",
    hub: "track hub file",
    session: "session file"
}

/**
 * The error a load fails with when a required part could not be read: which part, the resource, and what went wrong.
 * Its message is for the user, one line each.  Readers throw it; the browser wraps it with what was being loaded, see
 * genomeLoadError.
 */
class LoadError extends Error {

    /**
     * @param kind  The part that failed, a key of partNames
     * @param url  The resource that failed
     * @param cause  The error it failed with
     */
    constructor(kind, url, cause) {
        const resource = describeResource(url)
        super(`The ${partNames[kind] ?? kind} could not be read.\n${resource}\n${describeLoadError(cause)}`, {cause})
        this.name = 'LoadError'
        this.kind = kind
        this.url = resource
    }
}

/**
 * The error loading a genome fails with.  Its message is for the user: the genome, then what went wrong.  A LoadError
 * says which part could not be read; any other error (an invalid file, a missing locus, a bug) is given by its message.
 *
 * @param genomeName  The genome's id or name, if known
 * @param error  The error the load failed with
 * @returns {Error}  With the error as its cause
 */
function genomeLoadError(genomeName, error) {
    const headline = genomeName ? `Genome ${genomeName} could not be loaded` : "The genome could not be loaded"
    const message = error instanceof LoadError ?
        `${headline}: ${lowerFirst(error.message)}` :
        `${headline}.\n${describeLoadError(error)}`
    return new Error(message, {cause: error})
}

function lowerFirst(string) {
    return string.charAt(0).toLowerCase() + string.slice(1)
}

export {httpMessages, describeLoadError, describeLoadFailure, escapeHTML, loadFailure, LoadError, genomeLoadError}
