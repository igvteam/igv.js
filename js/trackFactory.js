import FeatureTrack from "./feature/featureTrack.js"
import RulerTrack from "./rulerTrack.js"
import {FileUtils} from "../node_modules/igv-utils/src/index.js"

const trackFunctions =
    new Map([
        ['feature', (config, browser) => new FeatureTrack(config, browser)],
        ['ruler', (config, browser) => new RulerTrack(config, browser)]
    ])

function knownTrackTypes () {
    return new Set(trackFunctions.keys())
}

/**
 * Return a track of the given type, passing configuration and a point to the IGV "Browser" object to its constructor function*
 * @param type -- track type (string)
 * @param config -- track configuration object
 * @param browser -- the IGV "Browser" object
 * @returns {IdeogramTrack|undefined}
 */
function getTrack (type, config, browser) {

    let trackKey
    switch (type) {
        case "annotation":
        case "genes":
        case "fusionjuncspan":
        case "snp":
            trackKey = "feature"
            break
        default:
            trackKey = type
    }

    return trackFunctions.has(trackKey) ?
        trackFunctions.get(trackKey)(config, browser) :
        undefined
}

/**
 * Add a track creator function to the factory lookup table.  Legacy function, superceded by registerTrackClass.
 *
 * @param type
 * @param track
 */
function registerTrackClass(type, trackClass) {
    trackFunctions.set(type, (config, browser) => new trackClass(config, browser))
}

function registerTrackCreatorFunction (type, track) {
    trackFunctions.set(type, track)
}

export {
    getTrack,
    trackFunctions,
    registerTrackClass,
    registerTrackCreatorFunction,
    knownTrackTypes
}
