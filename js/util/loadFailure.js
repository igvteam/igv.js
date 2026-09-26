const httpMessages = {
    "401": "Access unauthorized",
    "403": "Access forbidden",
    "404": "Not found"
}

function describeLoadError(error) {
    const msg = error.message || error.error || error.toString()
    return httpMessages.hasOwnProperty(msg) ? httpMessages[msg] : msg
}

/**
 * A load failure, as reported by the loadfailures event.
 *
 * @param kind  What failed to load, e.g. 'track' or 'chromAlias'
 * @param url  The resource that failed
 * @param error  The error the load failed with
 */
function loadFailure(kind, url, error) {
    return {kind, url, message: describeLoadError(error.cause || error)}
}

export {describeLoadError, loadFailure}
