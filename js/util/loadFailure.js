const httpMessages = {
    "401": "Access unauthorized",
    "403": "Access forbidden",
    "404": "Not found"
}

function describeLoadError(error) {
    const msg = error.message || error.error || error.toString()
    return httpMessages.hasOwnProperty(msg) ? httpMessages[msg] : msg
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

export {httpMessages, describeLoadError, describeLoadFailure, escapeHTML, loadFailure}
