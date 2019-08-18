// Defines the top-level API for the igv module

import {createBrowser, removeBrowser, visibilityChange, getBrowser} from './igv-create.js';
import oauth from './oauth.js';


function setGoogleOauthToken(accessToken) {
    return oauth.setToken(accessToken);
}



export {createBrowser, removeBrowser, visibilityChange, getBrowser, setGoogleOauthToken, oauth}