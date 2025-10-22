/**
 * Minimal utility functions extracted from legacy igvUtils
 * Only includes functions actually used by minimal browser
 */

/**
 * Test if a string is a data URL
 */
function isDataURL(url) {
    return url && url.startsWith("data:")
}

/**
 * Build options object for HTTP requests
 */
function buildOptions(config, options) {
    const defaultOptions = {
        oauthToken: config.oauthToken,
        headers: config.headers,
        withCredentials: config.withCredentials,
    }
    return Object.assign(defaultOptions, options)
}

/**
 * Test if the given value is a string or number
 */
function isSimpleType(value) {
    const simpleTypes = new Set(["boolean", "number", "string", "symbol"])
    const valueType = typeof value
    return (value !== undefined && (simpleTypes.has(valueType) || value.substring || value.toFixed))
}

/**
 * Test if value is an integer
 */
function isInteger(value) {
    return Number.isInteger(value)
}

export { isDataURL, buildOptions, isSimpleType, isInteger }
