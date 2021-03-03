/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import {Alert, InputDialog} from '../node_modules/igv-ui/dist/igv-ui.js';
import {GoogleAuth, igvxhr, oauth} from '../node_modules/igv-utils/src/index.js';
import $ from "./vendor/jquery-3.3.1.slim.js";
import Browser from "./browser.js";
import GenomeUtils from "./genome/genome.js";
import WindowSizePanel from "./windowSizePanel.js";
import DataRangeDialog from "./ui/dataRangeDialog.js";
import UserFeedback from "./ui/userFeedback.js";
import SVGSaveControl from "./ui/svgSaveControl.js";
import ZoomWidget from "./ui/zoomWidget.js";
import ChromosomeSelectWidget from "./ui/chromosomeSelectWidget.js";
import TrackLabelControl from "./ui/trackLabelControl.js";
import CenterGuide from "./ui/centerGuide.js";
import CursorGuide from "./ui/cursorGuide.js";
import NavbarManager from "./navbarManager.js";
import {createIcon} from "./igv-icons.js";
import SampleNameControl from "./ui/sampleNameControl.js";

let allBrowsers = [];

/**
 * Create an igv.browser instance.  This object defines the public API for interacting with the genome browser.
 *
 * @param parentDiv - DOM tree root
 * @param config - configuration options.
 *
 */
async function createBrowser(parentDiv, config) {

    if (undefined === config) config = {};

    // Initialize pre-defined genomes.  The genome list is shared among all browser instances
    if (!GenomeUtils.KNOWN_GENOMES) {
        await GenomeUtils.initializeGenomes(config);
    }

    setDefaults(config);

    if (config.queryParametersSupported !== false) {
        extractQuery(config);
    }
    if (config.apiKey) {
        igvxhr.setApiKey(config.apiKey);
    }
    if (config.oauthToken) {
        oauth.setToken(config.oauthToken);
    }
    if (config.clientId && (!GoogleAuth.isInitialized())) {
        await GoogleAuth.init({
            clientId: config.clientId,
            apiKey: config.apiKey,
            scope: 'https://www.googleapis.com/auth/userinfo.profile'
        })
    }

    // Set track order explicitly. Otherwise they will be ordered randomly as each completes its async load
    setTrackOrder(config);

    // Initial browser configuration -- settings that are independent of session
    const browser = new Browser(config, parentDiv);
    allBrowsers.push(browser);
    setControls(browser, config);
    browser.userFeedback = new UserFeedback($(browser.trackContainer));
    browser.userFeedback.hide();
    browser.inputDialog = new InputDialog(browser.$root.get(0));
    browser.dataRangeDialog = new DataRangeDialog(browser.$root);

    if (false === config.showTrackLabels) {
        browser.hideTrackLabels();
    } else {
        browser.showTrackLabels();
        if (browser.trackLabelControl) {
            browser.trackLabelControl.setState(browser.trackLabelsVisible);
        }
    }

    if (false === config.showCursorTrackingGuide) {
        browser.cursorGuide.doHide();
    } else {
        browser.cursorGuide.doShow();
    }
    if (false === config.showCenterGuide) {
        browser.centerGuide.doHide();
    } else {
        browser.centerGuide.doShow();
    }


    // Load initial session
    if (config.sessionURL) {
        await browser.loadSession({
            url: config.sessionURL
        })
    } else {
        await browser.loadSessionObject(config)
    }

    // Session dependent settings
    const isWGV = browser.isMultiLocusWholeGenomeView() || GenomeUtils.isWholeGenomeView(browser.referenceFrameList[0].chr);
    if (browser.isMultiLocusMode() || isWGV) {
        browser.centerGuide.forcedHide();
    } else {
        browser.centerGuide.forcedShow();
    }
    browser.navbarManager.navbarDidResize(browser.$navigation.width(), isWGV);


    return browser;

}

function removeBrowser(browser) {
    browser.dispose();
    browser.$root.remove();
    allBrowsers = allBrowsers.filter(item => item !== browser);
}

function removeAllBrowsers() {
    for (let browser of allBrowsers) {
        browser.dispose();
        browser.$root.remove();
    }
    allBrowsers = [];
}

/**
 * This function provided so clients can inform igv of a visibility change, typically when an igv instance is
 * made visible from a tab, accordion, or similar widget.
 */
async function visibilityChange() {
    for (let browser of allBrowsers) {
        await browser.visibilityChange();
    }
}

function setTrackOrder(conf) {

    let trackOrder = 1;

    if (conf.tracks) {
        conf.tracks.forEach(function (track) {
            if (track.order === undefined) {
                track.order = trackOrder++;
            }
        });
    }
}

function setControls(browser, conf) {

    const $navBar = createStandardControls(browser, conf);

    $navBar.insertBefore($(browser.trackContainer));

    if (false === conf.showControls) {
        $navBar.hide();
    }
}

function createStandardControls(browser, config) {

    browser.navbarManager = new NavbarManager(browser);

    const $navBar = $('<div>', {class: 'igv-navbar'});
    browser.$navigation = $navBar;

    const $navbarLeftContainer = $('<div>', {class: 'igv-navbar-left-container'});
    $navBar.append($navbarLeftContainer);

    // IGV logo
    const $logo = $('<div>', {class: 'igv-logo'});
    $navbarLeftContainer.append($logo);

    const logoSvg = logo();
    logoSvg.css("width", "34px");
    logoSvg.css("height", "32px");
    $logo.append(logoSvg);

    browser.$current_genome = $('<div>', {class: 'igv-current-genome'});
    $navbarLeftContainer.append(browser.$current_genome);
    browser.$current_genome.text('');

    const $genomicLocation = $('<div>', {class: 'igv-navbar-genomic-location'});
    $navbarLeftContainer.append($genomicLocation);

    // chromosome select widget
    browser.chromosomeSelectWidget = new ChromosomeSelectWidget(browser, $genomicLocation);
    if (undefined === config.showChromosomeWidget) {
        config.showChromosomeWidget = true;   // Default to true
    }
    if (true === config.showChromosomeWidget) {
        browser.chromosomeSelectWidget.$container.show();
    } else {
        browser.chromosomeSelectWidget.$container.hide();
    }

    const $locusSizeGroup = $('<div>', {class: 'igv-locus-size-group'});
    $genomicLocation.append($locusSizeGroup);

    const $searchContainer = $('<div>', {class: 'igv-search-container'});
    $locusSizeGroup.append($searchContainer);

    // browser.$searchInput = $('<input type="text" placeholder="Locus Search">');
    browser.$searchInput = $('<input>', {class: 'igv-search-input', type: 'text', placeholder: 'Locus Search'});
    $searchContainer.append(browser.$searchInput);

    browser.$searchInput.change(async () => {

        try {
            const str = browser.$searchInput.val()
            const referenceFrameList = await browser.search(str)

            if (referenceFrameList.length > 1) {
                browser.updateLocusSearchWidget(referenceFrameList)
                browser.windowSizePanel.updatePanel(referenceFrameList)
            }

        } catch (error) {
            Alert.presentAlert(error)
        }

    });

    const $searchIconContainer = $('<div>', {class: 'igv-search-icon-container'});
    $searchContainer.append($searchIconContainer);

    $searchIconContainer.append(createIcon("search"));

    $searchIconContainer.on('click', () => browser.search(browser.$searchInput.val()));

    browser.windowSizePanel = new WindowSizePanel($locusSizeGroup, browser);

    const $navbarRightContainer = $('<div>', {class: 'igv-navbar-right-container'});
    $navBar.append($navbarRightContainer);

    const $toggle_button_container = $('<div class="igv-navbar-toggle-button-container">');
    $navbarRightContainer.append($toggle_button_container);
    browser.$toggle_button_container = $toggle_button_container;

    browser.cursorGuide = new CursorGuide($(browser.trackContainer), $toggle_button_container, config, browser);

    browser.centerGuide = new CenterGuide($(browser.trackContainer), $toggle_button_container, config, browser);

    if (true === config.showTrackLabelButton) {
        browser.trackLabelControl = new TrackLabelControl($toggle_button_container, browser);
    }

    browser.sampleNamesVisible = config.showSampleNames
    if (true === config.showSampleNameButton) {
        browser.sampleNameControl = new SampleNameControl($toggle_button_container, browser)
    }

    if (true === config.showSVGButton) {
        browser.svgSaveControl = new SVGSaveControl($toggle_button_container, browser);
    }

    browser.zoomWidget = new ZoomWidget(browser, $navbarRightContainer);

    if (false === config.showNavigation) {
        browser.$navigation.hide();
    }

    return $navBar;
}


function setDefaults(config) {

    if (undefined === config.promisified) {
        config.promisified = false;
    }

    if (undefined === config.minimumBases) {
        config.minimumBases = 40;
    }

    if (undefined === config.showIdeogram) {
        config.showIdeogram = true;
    }

    if (undefined === config.showTrackLabelButton) {
        config.showTrackLabelButton = true;
    }

    if (undefined === config.showTrackLabels) {
        config.showTrackLabels = true;
    }

    if (undefined === config.showCursorTrackingGuideButton) {
        config.showCursorTrackingGuideButton = true;
    }

    if (undefined === config.showCursorTrackingGuide) {
        config.showCursorTrackingGuide = false;
    }

    if (undefined === config.showCenterGuideButton) {
        config.showCenterGuideButton = true;
    }

    if (undefined === config.showCenterGuide) {
        config.showCenterGuide = false;
    }

    if (undefined === config.showSampleNameButton) {
        config.showSampleNameButton = true
    }

    if (undefined === config.showSampleNames) {
        config.showSampleNames = true
    }

    if (undefined === config.showSVGButton) {
        config.showSVGButton = true;
    }

    if (config.showControls === undefined) {
        config.showControls = true;
    }

    if (config.showNavigation === undefined) {
        config.showNavigation = true;
    }

    if (config.showRuler === undefined) {
        config.showRuler = true;
    }

    if (config.flanking === undefined) {
        config.flanking = 1000;
    }

    if (config.pairsSupported === undefined) {
        config.pairsSupported = true;
    }

    if (!config.tracks) {
        config.tracks = [];
    }

}


function extractQuery(config) {

    var i1, i2, i, j, s, query, tokens, uri, key, value;

    uri = window.location.href;

    query = {};
    i1 = uri.indexOf("?");
    i2 = uri.lastIndexOf("#");

    let files
    let indexURLs
    if (i1 >= 0) {
        if (i2 < 0) i2 = uri.length;
        for (i = i1 + 1; i < i2;) {
            j = uri.indexOf("&", i);
            if (j < 0) j = i2;

            s = uri.substring(i, j);
            tokens = s.split("=", 2);

            if (tokens.length === 2) {
                key = tokens[0];
                value = decodeURIComponent(tokens[1]);

                if ('file' === key) {
                    // IGV desktop style file parameter
                    files = value.split(',')
                } else if ('index' === key) {
                    // IGV desktop style index parameter
                    indexURLs = value.split(',')
                } else {
                    config[key] = value;
                }
                i = j + 1;
            }
        }
    }

    if (files) {

        if (!config.tracks)
            config.tracks = []
        for (let i = 0; i < files.length; i++) {

            if (files[i].endsWith(".xml") || files[i].endsWith(".json")) {
                config.sessionURL = files[i]
                break;
            }

            const trackConfig = {url: files[i]}
            if (indexURLs && indexURLs.length > i) {
                trackConfig.indexURL = indexURLs[i]
            }
            config.tracks.push(trackConfig)
        }
    }

    return query;
}

function logo() {

    return $(
        '<svg width="690px" height="324px" viewBox="0 0 690 324" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
        '<title>IGV</title>' +
        '<g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">' +
        '<g id="IGV" fill="#666666">' +
        '<polygon id="Path" points="379.54574 8.00169252 455.581247 8.00169252 515.564813 188.87244 532.884012 253.529506 537.108207 253.529506 554.849825 188.87244 614.833392 8.00169252 689.60164 8.00169252 582.729511 320.722144 486.840288 320.722144"></polygon>' +
        '<path d="M261.482414,323.793286 C207.975678,323.793286 168.339046,310.552102 142.571329,284.069337 C116.803612,257.586572 103.919946,217.158702 103.919946,162.784513 C103.919946,108.410325 117.437235,67.8415913 144.472217,41.0770945 C171.507199,14.3125977 212.903894,0.930550071 268.663545,0.930550071 C283.025879,0.930550071 298.232828,1.84616386 314.284849,3.6774189 C330.33687,5.50867394 344.839793,7.97378798 357.794056,11.072835 L357.794056,68.968378 C339.48912,65.869331 323.578145,63.5450806 310.060654,61.9955571 C296.543163,60.4460336 284.574731,59.6712835 274.154998,59.6712835 C255.850062,59.6712835 240.502308,61.4320792 228.111274,64.9537236 C215.720241,68.4753679 205.793482,74.2507779 198.330701,82.2801269 C190.867919,90.309476 185.587729,100.87425 182.48997,113.974767 C179.392212,127.075284 177.843356,143.345037 177.843356,162.784513 C177.843356,181.942258 179.251407,198.000716 182.067551,210.960367 C184.883695,223.920018 189.671068,234.41436 196.429813,242.443709 C203.188559,250.473058 212.059279,256.178037 223.042241,259.558815 C234.025202,262.939594 247.683295,264.629958 264.01693,264.629958 C268.241146,264.629958 273.098922,264.489094 278.590403,264.207362 C284.081883,263.925631 289.643684,263.50304 295.275972,262.939577 L295.275972,159.826347 L361.595831,159.826347 L361.595831,308.579859 C344.698967,313.087564 327.239137,316.750019 309.215815,319.567334 C291.192494,322.38465 275.281519,323.793286 261.482414,323.793286 L261.482414,323.793286 L261.482414,323.793286 Z" id="Path"></path>;' +
        '<polygon id="Path" points="0.81355666 5.00169252 73.0472883 5.00169252 73.0472883 317.722144 0.81355666 317.722144"></polygon>' +
        '</g> </g> </svg>'
    );
}

async function createTrack (config, browser) {
    return await Browser.prototype.createTrack.call(browser, config)
}

export {createTrack, createBrowser, removeBrowser, removeAllBrowsers, visibilityChange}





