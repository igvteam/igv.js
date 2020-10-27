// Defines the top-level API for the igv module

import MenuUtils from "./ui/menuUtils.js";
import DataRangeDialog from "./ui/dataRangeDialog.js";
import IGVGraphics from "./igv-canvas.js";
import {createTrack, createBrowser, removeBrowser, removeAllBrowsers, visibilityChange} from './igv-create.js';
import oauth from './oauth.js';
import igvxhr from "./igvxhr.js";
import embedCss from "./embedCss.js";
import version from "./version.js"
import { appendRightHandGutter } from "./trackView.js";
const xhr = igvxhr;
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
    oauth,
    version,
    xhr,
    setApiKey,
    appendRightHandGutter
}

