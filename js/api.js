// Defines the top-level API for the igv module

import {createBrowser, removeBrowser, visibilityChange, getBrowser} from './igv-create.js';
import getDataWrapper from  "./feature/dataWrapper.js";
import oauth from './oauth.js';
import igvxhr from "./igvxhr.js";
import GtexUtils from "./gtex/gtexUtils.js";
import { createIcon } from "./igv-icons.js";
import { guid } from "./util/domUtils.js";
import { attachDialogCloseHandlerWithParent } from "./ui/ui-utils.js";
import { getFilename, getExtension, isFilePath } from "./util/fileUtils.js";
import { inferTrackTypes, inferFileFormat, knownFileExtensions } from './util/trackUtils.js';

function setGoogleOauthToken(accessToken) {
    return oauth.setToken(accessToken);
}

const xhr = igvxhr;

export {
    createBrowser,
    removeBrowser,
    visibilityChange,
    getBrowser,
    setGoogleOauthToken,
    oauth,
    //exports below are not supported and will be removed over time
    getFilename,
    getExtension,
    isFilePath,
    inferFileFormat,
    inferTrackTypes,
    knownFileExtensions,
    attachDialogCloseHandlerWithParent,
    guid,
    createIcon,
    GtexUtils,
    xhr,
    getDataWrapper};
