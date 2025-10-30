/**
 * Utilities for detecting problematic resources (local files, Google Drive URLs)
 * that cannot be reliably loaded when a session is shared or restored.
 */

/**
 * Check if an object is a local File instance
 * @param {*} obj - The object to check
 * @returns {boolean} True if the object is a File instance
 */
function isLocalFile(obj) {
    return obj instanceof File
}

/**
 * Check if a URL is a Google Drive URL
 * Google Drive URLs require authentication and will not work when shared.
 * 
 * @param {string|*} url - The URL to check
 * @returns {boolean} True if the URL is a Google Drive URL
 */
function isGoogleDriveURL(url) {
    if (typeof url !== 'string') {
        return false
    }
    // Match both googleapis.com/drive and drive.google.com URLs
    return url.includes('googleapis.com/drive') || url.includes('drive.google.com')
}

/**
 * Check if a value represents a problematic resource
 * @param {*} value - The value to check (could be a File, URL string, etc.)
 * @returns {'local-file' | 'google-drive' | null} The type of problematic resource, or null if OK
 */
function isProblematicResource(value) {
    if (isLocalFile(value)) {
        return 'local-file'
    }
    if (isGoogleDriveURL(value)) {
        return 'google-drive'
    }
    return null
}

export {
    isLocalFile,
    isGoogleDriveURL,
    isProblematicResource
}

