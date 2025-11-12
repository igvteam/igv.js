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
    // Use URL parsing to check the hostname and path
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        if (
            hostname === 'drive.google.com' ||
            hostname === 'www.googleapis.com' ||
            hostname === 'googleapis.com'
        ) {
            // For googleapis.com, ensure /drive/ is in the pathname
            if (hostname.includes('googleapis.com')) {
                return urlObj.pathname.includes('/drive/');
            }
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Extract the file ID from a Google Drive URL
 * Supports both googleapis.com/drive/v3/files/{fileId} and drive.google.com/file/d/{fileId} formats
 * 
 * @param {string} url - The Google Drive URL
 * @returns {string|null} The file ID if found, null otherwise
 */
function extractGoogleDriveFileId(url) {
    if (typeof url !== 'string') {
        return null
    }
    
    // Pattern 1: googleapis.com/drive/v3/files/{fileId}
    // Example: https://www.googleapis.com/drive/v3/files/1pO8Czk913zXRhU7MeWnXB6uSIwNpNqDV?alt=media
    const apiMatch = url.match(/\/drive\/v3\/files\/([^/?]+)/)
    if (apiMatch) {
        return apiMatch[1]
    }
    
    // Pattern 2: drive.google.com/file/d/{fileId}
    // Example: https://drive.google.com/file/d/1pO8Czk913zXRhU7MeWnXB6uSIwNpNqDV/view
    const driveMatch = url.match(/\/file\/d\/([^/]+)/)
    if (driveMatch) {
        return driveMatch[1]
    }
    
    // Pattern 3: drive.google.com/uc?export=download&id={fileId}
    // Example: https://drive.google.com/uc?export=download&id=1pO8Czk913zXRhU7MeWnXB6uSIwNpNqDV
    const ucMatch = url.match(/[?&]id=([^&]+)/)
    if (ucMatch) {
        return ucMatch[1]
    }
    
    return null
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
    isProblematicResource,
    extractGoogleDriveFileId
}

