// Defines the top-level API for the igv module

import {createBrowser, getBrowser, removeBrowser, removeAllBrowsers, visibilityChange} from './igv-create.js';
import oauth from './oauth.js';
import igvxhr from "./igvxhr.js";
import {setApiKey} from "./ga4gh/ga4ghHelper.js";
import embedCss from "./embedCss.js";
import version from "./version.js"

function setGoogleOauthToken(accessToken) {
    return oauth.setToken(accessToken);
}

const xhr = igvxhr;

embedCss();

export default {
    createBrowser,
    removeBrowser,
    removeAllBrowsers,
    visibilityChange,
    setGoogleOauthToken,
    oauth,
    version,
    getBrowser,
    xhr,
    setApiKey,
}

