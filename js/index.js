// Defines the top-level API for the igv module

import {createBrowser, removeBrowser, removeAllBrowsers, visibilityChange} from './igv-create.js';
import oauth from './oauth.js';
import igvxhr from "./igvxhr.js";
import embedCss from "./embedCss.js";
import version from "./version.js"
const xhr = igvxhr;
const setApiKey = igvxhr.setApiKey;

embedCss();

function setGoogleOauthToken(accessToken) {
    return oauth.setToken(accessToken);
}

export default {
    createBrowser,
    removeBrowser,
    removeAllBrowsers,
    visibilityChange,
    setGoogleOauthToken,
    oauth,
    version,
    xhr,
    setApiKey,
}

