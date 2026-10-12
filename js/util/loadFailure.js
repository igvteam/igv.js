import {FileUtils} from "../../node_modules/igv-utils/src/index.js"

const httpMessages = {
    "401": "Access unauthorized",
    "403": "Access forbidden",
    "404": "Not found"
}

// A request that got no response: the browser reports status 0 for a network error, a blocked cross-origin request,
// and a response the server sent without CORS headers (an error page, for a wrong URL, often has none)
const unreachableHint =
    "Check that the URL is correct. The server may also be down, or may not allow access from this web page (CORS)."

/**
 * Explain the error a load failed with, for the user, as what happened to the file: a phrase to follow its name, e.g.
 * "could not be reached", and for some failures a hint on what to do about it.  A request failure (from igvxhr,
 * which gives it a numeric status) is explained by its HTTP status, as its own message repeats the URL; any other
 * error by its message.
 *
 * @returns {{phrase: string, hint?: string}}
 */
function explainLoadError(error) {
    const msg = String(error.message || error.error || error.toString()).replaceAll('\n', ' ')
    const status = typeof error.status === 'number' ? error.status : httpMessages.hasOwnProperty(msg) ? Number(msg) : undefined
    switch (status) {
        case undefined:
            return {phrase: `could not be read: ${msg}`}
        case 0:
            return msg.startsWith("Timed out") ?
                {phrase: "could not be reached: the request timed out"} :
                {phrase: "could not be reached", hint: unreachableHint}
        case 401:
            return {phrase: "could not be accessed: unauthorized (HTTP status 401)"}
        case 403:
            return {phrase: "could not be accessed: forbidden (HTTP status 403)"}
        case 404:
            return {phrase: "was not found (HTTP status 404)"}
        default:
            return {phrase: `could not be read: the server responded with HTTP status ${status}`}
    }
}

function sentence(subject, phrase) {
    return `${subject} ${phrase}${/[.!?]$/.test(phrase) ? '' : '.'}`
}

/**
 * Describe the error a load failed with, for the user, as a sentence about the file, e.g. "The file could not be
 * reached. Check that the URL is correct. ..."
 */
function describeLoadError(error) {
    const {phrase, hint} = explainLoadError(error)
    const description = sentence("The file", phrase)
    return hint ? `${description} ${hint}` : description
}

/**
 * Name a resource for the user: a local File by its name, a URL as is, except a data or blob URL, which carries the
 * content itself and is cut short.
 */
function describeResource(url) {
    if (url?.name !== undefined) {
        return url.name   // A local File
    }
    const string = String(url)
    return /^(data|blob):/.test(string) && string.length > 60 ? `${string.slice(0, 60)}…` : string
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
 * Describe a load failure for an alert, one line each: for an optional part, its warning, if any, then the resource
 * and the error; for a failed load, the lines of its error's message.
 *
 * @param loadFailure  {kind, url, message, warning}, from loadFailure(), or the Error a load failed with
 * @returns {string}  HTML
 */
function describeLoadFailure(loadFailure) {
    const lines = loadFailure instanceof Error ?
        loadFailure.message.split('\n') :
        [loadFailure.warning, loadFailure.url, loadFailure.message].filter(line => line !== undefined)
    return lines.map(escapeHTML).join('<br>')
}

// What each kind of required part is called in a message to the user
const partNames = {
    twoBit: "2bit sequence file",
    fasta: "FASTA sequence file",
    fastaIndex: "FASTA index (.fai) file",
    chromSizes: "chromosome sizes file",
    genbank: "GenBank file",
    hub: "track hub file",
    session: "session file",
    track: "file",
    trackConfig: "track configuration",
    index: "index file"
}

/**
 * The error a load fails with when a required part could not be read.  Its message is for the user: which part and
 * what happened to it ("The 2bit sequence file could not be reached."), the resource, and a hint if there is one, one
 * line each.  Readers throw it; the browser wraps it with what was being loaded, see genomeLoadError.
 */
class LoadError extends Error {

    /**
     * @param kind  The part that failed, a key of partNames
     * @param url  The resource that failed, if there is one
     * @param cause  The error it failed with
     */
    constructor(kind, url, cause) {
        const resource = url == null ? undefined : describeResource(url)
        const {phrase, hint} = explainLoadError(cause)
        const lines = [sentence(`The ${partNames[kind] ?? kind}`, phrase)]
        if (resource !== undefined) lines.push(resource)
        if (hint) lines.push(hint)
        super(lines.join('\n'), {cause})
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
    return failedLoadError(genomeName ? `Genome ${genomeName} could not be loaded` : "The genome could not be loaded", error)
}

/**
 * The error loading a session file fails with: that the session could not be loaded, then what went wrong, as for
 * genomeLoadError.
 *
 * @param error  The error the load failed with
 * @returns {Error}  With the error as its cause
 */
function sessionLoadError(error) {
    return failedLoadError("The session could not be loaded", error)
}

/**
 * The error loading a track fails with: the track, then what went wrong, as for genomeLoadError.  A LoadError from a
 * reader names the part that failed; for any other error the track's file is taken to be what failed.
 *
 * @param config  The track configuration, or the json string of one (which may be what failed to parse)
 * @param error  The error the load failed with
 * @returns {Error}  With the error as its cause
 */
function trackLoadError(config, error) {
    if (error instanceof LoadError) {
        return failedLoadError(trackHeadline(config), error)
    }
    if (typeof config === 'string') {
        return failedLoadError(trackHeadline(config), new LoadError('trackConfig', undefined, error))
    }
    return failedLoadError(trackHeadline(config), new LoadError('track', config.url || config.fastaURL, error))
}

function trackHeadline(config) {
    if (typeof config !== 'string') {
        const url = config.url || config.fastaURL
        const name = config.name || (url && !isDataURL(url) ? FileUtils.getFilename(url) : undefined)
        if (name) return `Track ${name} could not be loaded`
    }
    return "The track could not be loaded"
}

function isDataURL(url) {
    return typeof url === 'string' && /^(data|blob):/.test(url)
}

/**
 * An error whose message leads with what could not be loaded, then what went wrong: a LoadError on the same line,
 * since it says which part failed, any other error by its message on the next.
 */
function failedLoadError(headline, error) {
    const message = error instanceof LoadError ?
        `${headline}: ${lowerFirst(error.message)}` :
        `${headline}.\n${String(error.message || error).replaceAll('\n', ' ')}`
    return new Error(message, {cause: error})
}

function lowerFirst(string) {
    return string.charAt(0).toLowerCase() + string.slice(1)
}

export {httpMessages, explainLoadError, describeLoadError, describeLoadFailure, escapeHTML, loadFailure, LoadError, genomeLoadError, sessionLoadError, trackLoadError}
