const defaultOptions = {
    minimumBases: 40,
    showIdeogram: true,
    showCytobandNames: false,
    showCircularView: false,
    showCircularViewButton: false,
    showTrackLabelButton: true,
    showTrackLabels: true,
    showCursorTrackingGuideButton: true,
    showCursorGuide: false,   // showCursorTrackingGuide is a synonym
    showCenterGuideButton: true,
    showCenterGuide: false,
    showSampleNames: false,
    showSVGButton: true,
    showControls: true,
    showNavigation: true,
    showRuler: true,
    flanking: 1000,
    pairsSupported: true,
    tracks: []
}

function setDefaults(config, defaults) {
    if (typeof defaults === "undefined") {
        defaults = defaultOptions
    }
    for (const key of Object.keys(defaults)) {
        if (config[key] === undefined) {
            config[key] = defaults[key]
        }
    }
    return config
}

export {setDefaults, defaultOptions}

