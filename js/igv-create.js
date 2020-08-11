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

import { InputDialog } from '../node_modules/igv-ui/dist/igv-ui.js';
import $ from "./vendor/jquery-3.3.1.slim.js";
import Browser from "./browser.js";
import GenomeUtils from "./genome/genome.js";
import WindowSizePanel from "./windowSizePanel.js";
import DataRangeDialog from "./ui/dataRangeDialog.js";
import TrackRemovalDialog from "./ui/trackRemovalDialog.js";
import UserFeedback from "./ui/userFeedback.js";
import SVGSaveControl from "./ui/svgSaveControl.js";
import ZoomWidget from "./ui/zoomWidget.js";
import ChromosomeSelectWidget from "./ui/chromosomeSelectWidget.js";
import TrackLabelControl from "./ui/trackLabelControl.js";
import CenterGuide from "./ui/centerGuide.js";
import CursorGuide from "./ui/cursorGuide.js";
import NavbarManager from "./navbarManager.js";
import igvxhr from "./igvxhr.js";
import oauth from "./oauth.js";
import google from "./google/googleUtils.js";
import {createIcon} from "./igv-icons.js";

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

    // Path to genomes.json file.   This is globally shared among all browser objects
    GenomeUtils.genomeList = config.genomeList || "https://s3.amazonaws.com/igv.org.genomes/genomes.json";

    setDefaults(config);

    // Explicit parameters have priority
    if (config.queryParametersSupported !== false) {
        extractQuery(config);
    }

    // Set track order explicitly. Otherwise they will be ordered randomly as each completes its async load
    setTrackOrder(config);

    const browser = new Browser(config, parentDiv);

    setControls(browser, config);

    // const str = [ 0, 1, 2, 3, 4, 5, 6, 7 ].map(digit => `ERROR ${ digit }. That was a bad thing.`).join('<br>')
    // browser.alert.present(str)

    browser.userFeedback = new UserFeedback(browser.$content);
    browser.userFeedback.hide();

    browser.inputDialog = new InputDialog(browser.$root.get(0));

    browser.trackRemovalDialog = new TrackRemovalDialog(browser.$root);

    browser.dataRangeDialog = new DataRangeDialog(browser.$root, browser);

    if (config.apiKey) {
        google.setApiKey(config.apiKey);
    }

    if (config.oauthToken) {
        oauth.setToken(config.oauthToken);
    }

    return loadSession(config)

        .then(function (ignore) {

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

            const isWGV = browser.isMultiLocusWholeGenomeView() || GenomeUtils.isWholeGenomeView(browser.genomicStateList[0].referenceFrame);

            // multi-locus mode or isWGV
            if (browser.isMultiLocusMode() || isWGV) {
                browser.centerGuide.forcedHide();
            } else {
                browser.centerGuide.forcedShow();
            }

            igvxhr.startup();

            browser.navbarManager.navbarDidResize(browser.$navigation.width(), isWGV);

            return browser;
        })

        .then(function (browser) {

            allBrowsers.push(browser);

            return browser;
        })


    function loadSession(config) {
        if (config.sessionURL) {
            return browser.loadSession({
                url: config.sessionURL
            })
        } else {
            return browser.loadSessionObject(config)
        }
    }

}

function removeBrowser(browser) {
    browser.dispose();
    browser.$root.remove();
    allBrowsers = allBrowsers.filter(item => item !== browser);
}
function removeAllBrowsers() {
    for(let browser of allBrowsers) {
        browser.dispose();
        browser.$root.remove();
    }
    allBrowsers = [];
}

// A hack to replace the global igv.browser for the purpose of alert dialogs
// TODO fixme
function getBrowser() {
    return allBrowsers[0];
}


/**
 * This function provided so clients can inform igv of a visibility change, typically when an igv instance is
 * made visible from a tab, accordion, or similar widget.
 */
function visibilityChange () {
    allBrowsers.forEach(function (browser) {
        browser.visibilityChange();
    })
}


function setTrackOrder(conf) {

    var trackOrder = 1;

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

    $navBar.insertBefore(browser.$contentHeader);

    if (false === conf.showControls) {
        $navBar.hide();
    }

}

function createStandardControls(browser, config) {

    var $div,
        $igv_nav_bar_left_container,
        $igv_nav_bar_right_container,
        $genomic_location,
        $locus_size_group,
        $toggle_button_container,
        logoDiv,
        logoSvg,
        $searchContainer;


    const $navBar = $('<div>', {class: 'igv-navbar'});
    browser.$navigation = $navBar;

    browser.navbarManager = new NavbarManager(browser);

    $igv_nav_bar_left_container = $('<div>', {class: 'igv-nav-bar-left-container'});
    $navBar.append($igv_nav_bar_left_container);

    // IGV logo
    logoDiv = $('<div>', {class: 'igv-logo'});
    logoSvg = logo();
    logoSvg.css("width", "34px");
    logoSvg.css("height", "32px");
    logoDiv.append(logoSvg);
    $igv_nav_bar_left_container.append(logoDiv);

    // current genome
    browser.$current_genome = $('<div>', {class: 'igv-current-genome'});
    $igv_nav_bar_left_container.append(browser.$current_genome);
    browser.$current_genome.text('');

    //
    $genomic_location = $('<div>', {class: 'igv-nav-bar-genomic-location'});
    $igv_nav_bar_left_container.append($genomic_location);

    // chromosome select widget
    browser.chromosomeSelectWidget = new ChromosomeSelectWidget(browser, $genomic_location);
    if (undefined === config.showChromosomeWidget) {
        config.showChromosomeWidget = true;   // Default to true
    }
    if (true === config.showChromosomeWidget) {
        browser.chromosomeSelectWidget.$container.show();
    } else {
        browser.chromosomeSelectWidget.$container.hide();
    }


    $locus_size_group = $('<div>', {class: 'igv-locus-size-group'});
    $genomic_location.append($locus_size_group);

    // locus goto widget container
    $searchContainer = $('<div>', {class: 'igv-search-container'});
    $locus_size_group.append($searchContainer);

    // locus goto input
    browser.$searchInput = $('<input type="text" placeholder="Locus Search">');
    $searchContainer.append(browser.$searchInput);

    browser.$searchInput.change(function (e) {

        browser.search($(this).val())

            .catch(function (error) {
                browser.alert.present(error);
            });
    });

    // search icon container
    $div = $('<div>');
    $searchContainer.append($div);

    // search icon svg
    $div.append(createIcon("search"));

    $div.click(function () {
        browser.search(browser.$searchInput.val());
    });

    // $searchContainer.append($faSearch);

    // TODO: Currently not used
    // search results presented in table
    // browser.$searchResults = $('<div class="igv-search-results">');
    // $searchContainer.append(browser.$searchResults.get(0));
    // browser.$searchResultsTable = $('<table>');
    // browser.$searchResults.append(browser.$searchResultsTable.get(0));
    // browser.$searchResults.hide();

    // window size display
    browser.windowSizePanel = new WindowSizePanel($locus_size_group, browser);


    // cursor guide | center guide | track labels

    $igv_nav_bar_right_container = $('<div class="igv-nav-bar-right-container">');
    $navBar.append($igv_nav_bar_right_container);

    $toggle_button_container = $('<div class="igv-nav-bar-toggle-button-container">');
    $igv_nav_bar_right_container.append($toggle_button_container);
    browser.$toggle_button_container = $toggle_button_container;

    // cursor guide
    // browser.cursorGuide = new CursorGuide($(browser.trackContainerDiv), $toggle_button_container, config, browser);
    browser.cursorGuide = new CursorGuide(browser.$content, $toggle_button_container, config, browser);

    // center guide
    browser.centerGuide = new CenterGuide($(browser.trackContainerDiv), $toggle_button_container, config, browser);

    // toggle track labels
    if (true === config.showTrackLabelButton) {
        browser.trackLabelControl = new TrackLabelControl($toggle_button_container, browser);
    }

    // SVG save button
    if (config.showSVGButton) {
        browser.svgSaveControl = new SVGSaveControl($toggle_button_container, browser);
    }

    // zoom widget
    browser.zoomWidget = new ZoomWidget(browser, $igv_nav_bar_right_container);

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

    if (undefined === config.showCursorTrackingGuideButton) {
        config.showCursorTrackingGuideButton = true;
    }

    if (undefined === config.showCenterGuideButton) {
        config.showCenterGuideButton = true;
    }

    if (undefined === config.showSVGButton) {
        config.showSVGButton = true;
    }

    if (undefined === config.showTrackLabelButton) {
        config.showTrackLabelButton = true;
    }

    if (undefined === config.showCursorTrackingGuide) {
        config.showCursorTrackingGuide = false;
    }

    if (undefined === config.showCenterGuide) {
        config.showCenterGuide = false;
    }

    if (undefined === config.showTrackLabels) {
        config.showTrackLabels = true;
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

    if (config.showSequence === undefined) {
        config.showSequence = true;
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

    if (config.showSequence) {
        config.tracks.push({type: "sequence", order: -Number.MAX_SAFE_INTEGER});
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

function createTrack (config, browser) {
    return Browser.prototype.createTrack.call(browser, config)
}

export {createBrowser, removeBrowser, removeAllBrowsers, visibilityChange, getBrowser, createTrack}





