// Defines the top-level API for the igv module

import { Popover, InputDialog, AlertDialog, Alert } from '../node_modules/igv-ui/dist/igv-ui.js';
import {createBrowser, createTrack, getBrowser, removeBrowser, visibilityChange} from './igv-create.js';
import getDataWrapper from "./feature/dataWrapper.js";
import oauth from './oauth.js';
import igvxhr from "./igvxhr.js";
import GtexUtils from "./gtex/gtexUtils.js";
import GenomeUtils from "./genome/genome.js";
import {createIcon} from "./igv-icons.js";
import {guid,pageCoordinates, translateMouseCoordinates} from "./util/domUtils.js";
import {attachDialogCloseHandlerWithParent, createColorSwatchSelector} from "./ui/ui-utils.js";
import {getExtension, getFilename, isFilePath} from "./util/fileUtils.js";
import {inferFileFormat, inferTrackTypes, knownFileExtensions} from './util/trackUtils.js';
import {isString, numberFormatter, splitLines} from "./util/stringUtils.js";
import { doAutoscale, download } from './util/igvUtils.js';
import IGVColor from "./igv-color.js";
import IGVGraphics from "./igv-canvas.js";
import google from "./google/googleUtils.js";
import TrackView from "./trackView.js";
import makeDraggable from "./ui/draggable.js";
import TrackRemovalDialog from "./ui/trackRemovalDialog.js";
import DataRangeDialog from "./ui/dataRangeDialog.js";
import embedCss from "./embedCss.js";
import MenuUtils from "./ui/menuUtils.js";
import version from "./version.js"

function setGoogleOauthToken(accessToken) {
    return oauth.setToken(accessToken);
}

function setApiKey(apiKey) {
    return google.setApiKey(apiKey);
}

// for juicebox
function appendRightHandGutter($parent) {
    TrackView.prototype.appendRightHandGutter.call(this, $parent);
}

const xhr = igvxhr;
const Color = IGVColor;
const graphics = IGVGraphics;

console.log('igvjs. calling embedCss() ...');
embedCss();
console.log('... done.');

export default {
    createBrowser,
    removeBrowser,
    visibilityChange,
    setGoogleOauthToken,
    oauth,
    version,

    download,
    getBrowser,
    doAutoscale,
    graphics,
    createTrack,
    getFilename,
    getExtension,
    isFilePath,
    inferFileFormat,
    inferTrackTypes,
    knownFileExtensions,
    appendRightHandGutter,
    attachDialogCloseHandlerWithParent,
    guid,
    pageCoordinates,
    translateMouseCoordinates,
    createIcon,
    GtexUtils,
    GenomeUtils,
    xhr,
    Color,
    splitLines,
    isString,
    numberFormatter,
    getDataWrapper,
    setApiKey,
    createColorSwatchSelector,
    makeDraggable,
    Popover,
    AlertDialog,
    InputDialog,
    TrackRemovalDialog,
    DataRangeDialog,
    MenuUtils,
    Alert,
    google
}

