// Defines the top-level API for the igv module

import MenuUtils from "./ui/menuUtils.js";
import DataRangeDialog from "./ui/dataRangeDialog.js";
import IGVGraphics from "./igv-canvas.js";
import {createBrowser, createTrack, removeAllBrowsers, removeBrowser, visibilityChange} from './igv-create.js';
import {doAutoscale} from "./util/igvUtils.js";
import embedCss from "./embedCss.js";
import version from "./version.js"
import TrackView from "./trackView.js"
import {igvxhr, oauth} from "../node_modules/igv-utils/src/index.js"

const setApiKey = igvxhr.setApiKey;

embedCss();

function setGoogleOauthToken(accessToken) {
    return oauth.setToken(accessToken);
}

function setOauthToken(accessToken, host) {
    return oauth.setToken(accessToken, host)
}

export default {
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
    doAutoscale,
    TrackView
}

