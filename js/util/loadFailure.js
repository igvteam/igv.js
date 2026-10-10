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
 */
function loadFailure(kind, url, error) {
    return {kind, url: describeResource(url), message: describeLoadError(error.cause || error)}
}

/**
 * Warn that an optional part failed to load: log the error, and alert the user with what failed and its likely
 * consequence, then the resource and the error.  Alerts are queued, so this never hides another.
 *
 * @param browser  The browser to alert in; if undefined (e.g. in unit tests) the failure is only logged
 * @param message  What failed and its consequence, e.g. "Cytobands could not be loaded: ..."
 * @param url  The resource that failed
 * @param error  The error the load failed with
 */
function presentLoadWarning(browser, message, url, error) {
    console.error(error)
    browser?.alert?.present(
        `${escapeHTML(message)}<br><br>${escapeHTML(describeResource(url))}<br>${escapeHTML(describeLoadError(error.cause || error))}`)
}

export {httpMessages, describeLoadError, escapeHTML, loadFailure, presentLoadWarning}
