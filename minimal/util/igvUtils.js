/**
 * Utility functions needed by BigWig reader
 */

export function buildOptions(config, options) {
    const defaultOptions = {
        oauthToken: config.oauthToken,
        headers: config.headers,
        withCredentials: config.withCredentials,
        filename: config.filename
    }
    return Object.assign(defaultOptions, options)
}

export function isDataURL(obj) {
    return (typeof obj === 'string' && obj.startsWith("data:"))
}

