/**
 * Utility functions for browser configuration
 */

/**
 * Set default configuration values for the browser
 * @param {Object} config - The configuration object to set defaults for
 * @returns {Object} The configuration object with defaults set
 */
export function setDefaults(config) {
    if (undefined === config.minimumBases) {
        config.minimumBases = 40
    }

    if (undefined === config.showIdeogram) {
        config.showIdeogram = true
    }

    if (undefined == config.showCytobandNames) {
        config.showCytobandNames = false
    }

    if (undefined === config.showCircularView) {
        config.showCircularView = false
    }

    if (undefined === config.showCircularViewButton) {
        config.showCircularViewButton = false
    }

    if (undefined === config.showTrackLabelButton) {
        config.showTrackLabelButton = true
    }

    if (undefined === config.showTrackLabels) {
        config.showTrackLabels = true
    }

    if (undefined === config.showCursorTrackingGuideButton) {
        config.showCursorTrackingGuideButton = true
    }

    if (undefined === config.showCursorGuide) {
        config.showCursorGuide = config.showCursorTrackingGuide || false   // showCursorTrackingGuide is a synonym
    }

    if (undefined === config.showCenterGuideButton) {
        config.showCenterGuideButton = true
    }

    if (undefined === config.showCenterGuide) {
        config.showCenterGuide = false
    }

    if (undefined === config.showSampleNames) {
        config.showSampleNames = false
    }

    if (undefined === config.showSVGButton) {
        config.showSVGButton = true
    }

    if (config.showControls === undefined) {
        config.showControls = true
    }

    if (config.showNavigation === undefined) {
        config.showNavigation = true
    }

    if (config.showRuler === undefined) {
        config.showRuler = true
    }

    if (config.flanking === undefined) {
        config.flanking = 1000
    }

    if (config.pairsSupported === undefined) {
        config.pairsSupported = true
    }

    if (!config.tracks) {
        config.tracks = []
    }

    return config
} 