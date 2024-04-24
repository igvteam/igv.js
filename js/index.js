// Defines the top-level API for the igv module

import MenuUtils from "./ui/menuUtils.js"
import DataRangeDialog from "./ui/dataRangeDialog.js"
import IGVGraphics from "./igv-canvas.js"
import {createBrowser, createTrack, removeAllBrowsers, removeBrowser, visibilityChange} from './igv-create.js'
import embedCss from "./embedCss.js"
import version from "./version.js"
import * as TrackUtils from "./util/trackUtils.js"
import {registerFileFormats} from "./util/trackUtils.js"
import {igvxhr} from "../node_modules/igv-utils/src/index.js"
import {registerTrackClass, registerTrackCreatorFunction} from "./trackFactory.js"
import TrackBase from "./trackBase.js"
import Hub from "./ucsc/ucscHub.js"
import Browser from "./browser.js"

const setApiKey = igvxhr.setApiKey

function setGoogleOauthToken(accessToken) {
    return igvxhr.setOauthToken(accessToken)
}

function setOauthToken(accessToken, host) {
    return igvxhr.setOauthToken(accessToken, host)
}

// Backward compatibility
const oauth = igvxhr.oauth

export default {
    TrackUtils,
    IGVGraphics,
    MenuUtils,
    DataRangeDialog,
    createTrack,
    createBrowser,
    removeBrowser,
    removeAllBrowsers,
    visibilityChange,
    setGoogleOauthToken,
    setOauthToken,
    oauth,
    version,
    setApiKey,
    TrackBase,
    registerTrackClass,
    registerTrackCreatorFunction,
    registerFileFormats,
    loadSessionFile: Browser.loadSessionFile
}

