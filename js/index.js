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
    version,
    setApiKey,
    doAutoscale,
    TrackView
}

