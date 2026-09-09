import {inferFileFormat} from "../util/fileFormatUtils.js"

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
        this.resourceConfigs = []
        Array.from(resourceElements).forEach(function (r, idx) {
            var config = {
                url: r.getAttribute("path"),
                order: idx
            }
            // NOTE: getAttribute returns null for missing attributes.  Only set "indexURL" if actually present,
            // a null value is interpreted as "indexed" by some readers.
            if (r.hasAttribute("index")) {
                config.indexURL = r.getAttribute("index")
            }
            if (r.hasAttribute("format")) {
                config.format = r.getAttribute("format")
            }
            resourceMap.set(config.url, config)
            this.resourceConfigs.push(config)
            if (!hasTrackElements) {
                tracks.push(config)
            }
        }, this)

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

    /**
     * Resolve the format of resources whose type could not be determined from the session file.  The XML session
     * format is a legacy of IGV desktop and does not explicitly identify sample info resources, so as with IGV
     * desktop a format is inferred from the file name, and failing that the file contents.  Sample info is the
     * fallback for a tab delimited text file of otherwise unknown format -- we can never know for sure.
     *
     * This is a separate, asynchronous step as it can require reading the first bytes of the resource.
     *
     * @returns {Promise<XMLSession>}
     */
    async init() {

        for (const config of this.resourceConfigs) {

            if (!config.format && !config.type && config.url) {
                try {
                    const format = await inferFileFormat(config, {sampleInfoFallback: true})
                    if (format) {
                        config.format = format
                    }
                } catch (e) {
                    console.warn(`Error inferring format for session resource ${config.url}`, e)
                }
            }

            if (config.format && config.format.toLowerCase() === "sampleinfo") {
                // Sample info is not a track
                const idx = this.tracks.indexOf(config)
                if (idx >= 0) {
                    this.tracks.splice(idx, 1)
                }
                if (this.sampleinfo) {
                    this.sampleinfo.push({url: config.url})
                } else {
                    this.sampleinfo = [{url: config.url}]
                }
            }
        }

        this.resourceConfigs = undefined

        return this
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

    if(track.hasAttribute("type")) {
         config.type = track.getAttribute("type")
    }
    if(track.hasAttribute("format")) {
        config.format = track.getAttribute("format")
    }

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
        config.min = Number(dataRange.getAttribute("minimum"))
        config.max = Number(dataRange.getAttribute("maximum"))
        config.logScale = dataRange.getAttribute("type") === "LOG"
    }
}

export default XMLSession
