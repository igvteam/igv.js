/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
 * Author: Jim Robinson
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


/**
 * Minimal support for the legacy IGV desktop session format.
 */

class XMLSession {

    constructor(xmlString, knownGenomes) {

        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(xmlString, "text/xml")

        this.processRootNode(xmlDoc, knownGenomes)

        const resourceElements = xmlDoc.getElementsByTagName("Resource")
        const trackElements = xmlDoc.getElementsByTagName("Track")
        const hasTrackElements = trackElements && trackElements.length > 0

        const tracks = []
        this.tracks = tracks

        const resourceMap = new Map()
        Array.from(resourceElements).forEach(function (r, idx) {
            var config = {
                url: r.getAttribute("path"),
                indexURL: r.getAttribute("index"),
                order: idx
            }
            resourceMap.set(config.url, config)
            if (!hasTrackElements) {
                tracks.push(config)
            }
        })

        // Check for optional Track section
        if (hasTrackElements) {

            Array.from(trackElements).forEach(function (track) {

                const subtracks = track.getElementsByTagName("Track")

                if (subtracks && subtracks.length > 0) {

                    const mergedTrack = {
                        type: 'merged',
                        tracks: []
                    }
                    extractTrackAttributes(track, mergedTrack)

                    tracks.push(mergedTrack)

                    Array.from(subtracks).forEach(function (t) {
                        t.processed = true
                        const id = t.getAttribute("id")
                        const config = resourceMap.get(id)
                        if (config) {
                            mergedTrack.tracks.push(config)
                            extractTrackAttributes(t, config)
                            config.autoscale = false
                            mergedTrack.height = config.height

                            // Add alpha for merged track colors.  Alpha is not recorded by IGV desktop in XML session
                            //const color = t.getAttribute("color");
                            //if (color) {
                            //    config.color = "rgba(" + color + ",0.5)";
                            //}
                        }
                    })
                } else if (!track.processed) {

                    const id = track.getAttribute("id")
                    const res = resourceMap.get(id)
                    if (res) {
                        tracks.push(res)
                        extractTrackAttributes(track, res)
                    }

                }
            })
        }
    }

    processRootNode(xmlDoc, knownGenomes) {

        const elements = xmlDoc.getElementsByTagName("Session")
        if (!elements || elements.length === 0) {
            //TODO throw error
        }
        const session = elements.item(0)
        const genome = session.getAttribute("genome")
        const locus = session.getAttribute("locus")
        const ucscID = session.getAttribute("ucscID")

        if (knownGenomes && knownGenomes.hasOwnProperty(genome)) {
            this.genome = genome

        } else {
            this.reference = {
                fastaURL: genome
            }
            if (ucscID) {
                this.reference.id = ucscID
            }
        }
        if (locus) {
            this.locus = locus
        }
    }

}


function extractTrackAttributes(track, config) {


    config.name = track.getAttribute("name")

    const color = track.getAttribute("color")
    if (color) {
        config.color = "rgb(" + color + ")"
    }

    const altColor = track.getAttribute("altColor")
    if (color) {
        config.altColor = "rgb(" + altColor + ")"
    }

    const height = track.getAttribute("height")
    if (height) {
        config.height = parseInt(height)
    }

    const autoScale = track.getAttribute("autoScale")
    if (autoScale) {
        config.autoscale = (autoScale === "true")
    }

    const autoscaleGroup = track.getAttribute("autoscaleGroup")
    if (autoscaleGroup) {
        config.autoscaleGroup = autoscaleGroup
    }

    const windowFunction = track.getAttribute("windowFunction")
    if (windowFunction) {
        config.windowFunction = windowFunction
    }
    const visWindow = track.getAttribute("visibilityWindow") || track.getAttribute("featureVisibilityWindow")
    if (visWindow) {
        config.visibilityWindow = visWindow
    }

    const indexed = track.getAttribute("indexed")
    if (indexed) {
        config.indexed = (indexed === "true")
    }

    const normalize = track.getAttribute("normalize")
    if (normalize) {
        config.normalize = normalize === "true"
    }

    const dataRangeCltn = track.getElementsByTagName("DataRange")
    if (dataRangeCltn.length > 0) {
        const dataRange = dataRangeCltn.item(0)
        config.min = Number.parseFloat(dataRange.getAttribute("minimum"))
        config.max = Number.parseFloat(dataRange.getAttribute("maximum"))
        config.logScale = dataRange.getAttribute("type") === "LOG"
    }
}

export default XMLSession
