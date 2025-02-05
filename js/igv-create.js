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

import {GoogleAuth, igvxhr} from '../node_modules/igv-utils/src/index.js'
import Browser from "./browser.js"
import GenomeUtils from "./genome/genomeUtils.js"

let allBrowsers = []

/**
 * Create an igv.browser instance.  This object defines the public API for interacting with the genome browser.
 *
 * @param parentDiv - DOM tree root
 * @param config - configuration options.
 *
 */
async function createBrowser(parentDiv, config) {

    if (undefined === config) config = {}

    // Initialize pre-defined genomes.  The genome list is shared among all browser instances
    if (!GenomeUtils.KNOWN_GENOMES) {
        await GenomeUtils.initializeGenomes(config)
    }

    setDefaults(config)

    if (config.queryParametersSupported) {
        extractQuery(config)
    }
    if (config.apiKey) {
        igvxhr.setApiKey(config.apiKey)
    }
    if (config.oauthToken) {
        igvxhr.setOauthToken(config.oauthToken)
    }
    if (config.clientId && (!GoogleAuth.isInitialized())) {
        await GoogleAuth.init({
            client_id: config.clientId,
            apiKey: config.apiKey,
            scope: 'https://www.googleapis.com/auth/userinfo.profile'
        })
    }

    // Create browser
    const browser = new Browser(config, parentDiv)
    allBrowsers.push(browser)

    const sessionURL = config.sessionURL || config.session || config.hubURL
    if (sessionURL) {
        await browser.loadSession({
            url: sessionURL
        })
    } else {
        await browser.loadSessionObject(config)
    }

    browser.navbar.navbarDidResize()

    return browser

}

function removeBrowser(browser) {
    browser.dispose()
    browser.root.remove()
    allBrowsers = allBrowsers.filter(item => item !== browser)
}

function removeAllBrowsers() {
    for (let browser of allBrowsers) {
        browser.dispose()
        browser.root.remove()
    }
    allBrowsers = []
}

function getAllBrowsers() {
    return allBrowsers
}

/**
 * This function provided so clients can inform igv of a visibility change, typically when an igv instance is
 * made visible from a tab, accordion, or similar widget.
 */
async function visibilityChange() {
    for (let browser of allBrowsers) {
        await browser.visibilityChange()
    }
}

function setDefaults(config) {

    if (undefined === config.minimumBases) {
        config.minimumBases = 40
    }

    if (undefined === config.showIdeogram) {
        config.showIdeogram = true
    }

    if (undefined == config.showCytobandNames) {
        config.showCytobandNames = false
    }

    if (undefined === config.showCircularView) {
        config.showCircularView = false
    }

    if (undefined === config.showCircularViewButton) {
        config.showCircularViewButton = false
    }

    if (undefined === config.showTrackLabelButton) {
        config.showTrackLabelButton = true
    }

    if (undefined === config.showTrackLabels) {
        config.showTrackLabels = true
    }

    if (undefined === config.showCursorTrackingGuideButton) {
        config.showCursorTrackingGuideButton = true
    }

    if (undefined === config.showCursorGuide) {
        config.showCursorGuide = config.showCursorTrackingGuide || false   // showCursorTrackingGuide is a synonym
    }

    if (undefined === config.showCenterGuideButton) {
        config.showCenterGuideButton = true
    }

    if (undefined === config.showCenterGuide) {
        config.showCenterGuide = false
    }

    if (undefined === config.showSampleNames) {
        config.showSampleNames = false
    }

    if (undefined === config.showSVGButton) {
        config.showSVGButton = true
    }

    if (config.showControls === undefined) {
        config.showControls = true
    }

    if (config.showNavigation === undefined) {
        config.showNavigation = true
    }

    if (config.showRuler === undefined) {
        config.showRuler = true
    }

    if (config.flanking === undefined) {
        config.flanking = 1000
    }

    if (config.pairsSupported === undefined) {
        config.pairsSupported = true
    }

    if (!config.tracks) {
        config.tracks = []
    }

    return config

}


function extractQuery(config) {

    var i1, i2, i, j, s, query, tokens, uri, key, value

    uri = window.location.href

    query = {}
    i1 = uri.indexOf("?")
    i2 = uri.lastIndexOf("#")

    let files
    let indexURLs
    let names
    if (i1 >= 0) {
        if (i2 < 0) i2 = uri.length
        for (i = i1 + 1; i < i2;) {
            j = uri.indexOf("&", i)
            if (j < 0) j = i2

            s = uri.substring(i, j)
            tokens = s.split("=", 2)

            if (tokens.length === 2) {
                key = tokens[0]
                value = decodeURIComponent(tokens[1])

                if ('file' === key) {
                    // IGV desktop style file parameter
                    files = value.split(',')
                } else if ('index' === key) {
                    // IGV desktop style index parameter
                    indexURLs = value.split(',')
                } else if ('name' === key) {
                    // IGV desktop style index parameter
                    names = value.split(',')
                } else if ('genome' === key) {
                    if ((value.startsWith("https://") || value.startsWith("http://")) && !value.endsWith(".json")) {
                        // IGV desktop compatibility -- assuming url to fasta
                        config['reference'] = {
                            fastaURL: value,
                            indexURL: value + ".fai"
                        }
                    } else {
                        config[key] = value
                        config['reference'] = undefined
                    }
                } else {
                    if ('reference' === key) {
                        config['genome'] = undefined   // Can specify either reference or genome, not both
                    }
                    config[key] = value
                }
                i = j + 1
            } else {
                i++
            }
        }
    }

    if (files) {
        if (!config.tracks)
            config.tracks = []
        for (let i = 0; i < files.length; i++) {

            if (files[i].endsWith(".xml") || files[i].endsWith(".json")) {
                config.sessionURL = files[i]
                break
            }

            const trackConfig = {url: files[i]}
            if (indexURLs && indexURLs.length > i) {
                trackConfig.indexURL = indexURLs[i]
            }
            if (names && names.length > i) {
                trackConfig.name = names[i]
            }
            config.tracks.push(trackConfig)
        }
    }

    return query
}


async function createTrack(config, browser) {
    return await Browser.prototype.createTrack.call(browser, config)
}

export {createTrack, createBrowser, removeBrowser, removeAllBrowsers, getAllBrowsers, visibilityChange, setDefaults}
