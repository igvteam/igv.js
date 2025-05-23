import {StringUtils} from "../../../node_modules/igv-utils/src/index.js"
import TrackConfigContainer from "./trackConfigContainer.js"

const supportedTypes = new Set([
    "bigbed", "bigwig", "biggenepred", "vcftabix", "refgene",
    "bam", "sampleinfo", "vcf.list", "ucscsnp", "bed", "tdf", "gff", "gff3", "gtf", "vcf", "vcfphasedtrio",
    "bigdbsnp", "rmask", "genepred", "wig", "bedgraph", "interact", "broadpeak", "narrowpeak", "gappedpeak",
    "gistic", "seg", "mut, bigrmsk"
])

const filterTracks = new Set(["cytoBandIdeo", "assembly", "gap", "gapOverlap", "allGaps",
    "cpgIslandExtUnmasked", "windowMasker"])

const vizModeMap = {
    "pack": "EXPANDED",
    "full": "EXPANDED",
    "squish": "SQUISHED",
    "dense": "COLLAPSED"
}

const typeFormatMap = {
    "vcftabix": "vcf",
    "vcfphasedtrio": "vcf",
    "bigdbsnp": "bigbed",
    "genepred": "refgene"
}

class TrackDbHub {

    constructor(trackStanzas, groupStanzas) {
        this.groupStanzas = groupStanzas
        this.trackStanzas = trackStanzas
    }


    getSupportedTrackCount() {
        let count = 0
        for (const t of this.trackStanzas) {
            if (!filterTracks.has(t.name) &&
                t.hasProperty("bigDataUrl") &&
                t.format &&
                supportedTypes.has(t.format.toLowerCase())) {
                count++
            }
        }
        return count
    }

    getGroupedTrackConfigurations() {

        if (!this.groupTrackConfigs) {
            this.groupTrackConfigs = []
            const trackContainers = new Map()

            // create a container for tracks with no parent
            const nullContainer = new TrackConfigContainer('', '', 0, true)
            this.groupTrackConfigs.push(nullContainer)

            const hasGroups = this.groupStanzas && this.groupStanzas.length > 0
            if (hasGroups) {
                for (const groupStanza of this.groupStanzas) {
                    const name = groupStanza.getProperty("name")
                    const defaultOpen = groupStanza.getProperty("defaultIsClosed") === "0"
                    const priority = groupStanza.hasProperty("priority") ? getPriority(groupStanza.getProperty("priority")) : Number.MAX_SAFE_INTEGER - 1
                    const container = new TrackConfigContainer(name, groupStanza.getProperty("label"), priority, defaultOpen)
                    trackContainers.set(name, container)
                    this.groupTrackConfigs.push(container)
                }
            }

            for (let s of this.trackStanzas) {

                const isContainer = (s.hasOwnProperty("superTrack") && !s.hasOwnProperty("bigDataUrl")) ||
                    s.hasOwnProperty("compositeTrack") || s.hasOwnProperty("view") ||
                    (s.hasOwnProperty("container") && s.getOwnProperty("container").equals("multiWig"))

                // Find parent, if any. "group" containers can be implicit, all other types should be explicitly
                // defined before their children
                let parent

                if (s.hasOwnProperty("parent")) {
                    parent = trackContainers.get(s.getOwnProperty("parent"))
                }

                if (!parent && hasGroups && s.hasProperty("group")) {
                    const groupName = s.getProperty("group")
                    if (trackContainers.has(groupName)) {
                        parent = trackContainers.get(groupName)
                    } else {
                        const container = new TrackConfigContainer(groupName, groupName, 1000, true)
                        trackContainers.set(groupName, container)
                        this.groupTrackConfigs.push(container)
                        parent = container
                    }
                }

                if (isContainer) {

                    const name = s.getProperty("track")
                    const priority = s.hasProperty("priority") ? getPriority(s.getProperty("priority")) : Number.MAX_SAFE_INTEGER - 1
                    const defaultOpen = s.getProperty("defaultIsClosed") === "0"
                    const longLabel = s.getOwnProperty("longLabel")
                    const label = longLabel && longLabel.length < 50 ? longLabel : s.getOwnProperty("shortLabel")
                    const container = new TrackConfigContainer(name, label, priority, defaultOpen)

                    if (trackContainers.has(name)) {
                        throw new Error(`Duplicate track container: ${name}`)
                    }
                    trackContainers.set(name, container)

                    if (parent) {
                        parent.children.push(container)
                    } else {
                        // No parent or a superTrack => promote to top level
                        this.groupTrackConfigs.push(container)
                    }
                } else if (!filterTracks.has(s.name) &&
                    s.hasProperty("bigDataUrl") &&
                    s.format &&
                    supportedTypes.has(s.format.toLowerCase())) {

                    const trackConfig = this.#getTrackConfig(s)
                    if (parent) {
                        parent.tracks.push(trackConfig)
                    } else {
                        nullContainer.tracks.push(trackConfig)
                    }
                }
            }

        }

        // Filter empty groups and sort
        this.groupTrackConfigs.forEach(c => c.trim())
        this.groupTrackConfigs = this.groupTrackConfigs.filter(t => !t.isEmpty())

        this.groupTrackConfigs.sort((a, b) => a.priority - b.priority)
        return this.groupTrackConfigs
    }

    /**
     * Return an array of igv track config objects that satisfy the filter
     */
    #getTracksConfigs(filter) {
        return this.trackStanzas.filter(t => {
            return supportedTypes.has(t.format) && t.hasProperty("bigDataUrl") && (!filter || filter(t))
        })
            .map(t => this.#getTrackConfig(t))
    }


    /** example
     * track gc5Base
     * shortLabel GC Percent
     * longLabel GC Percent in 5-Base Windows
     * group map
     * visibility full
     * autoScale Off
     * maxHeightPixels 128:36:16
     * graphTypeDefault Bar
     * gridDefault OFF
     * windowingFunction Mean
     * color 0,0,0
     * altColor 128,128,128
     * viewLimits 30:70
     * type bigWig 0 100
     * bigDataUrl bbi/GCA_011100615.1_Macaca_fascicularis_6.0.gc5Base.bw
     * html html/GCA_011100615.1_Macaca_fascicularis_6.0.gc5Base
     * @param t
     */
    #getTrackConfig(t) {

        const format = t.format

        const config = {
            "id": t.getProperty("track"),
            "name": t.getProperty("shortLabel"),
            "format": format,
            "url": t.getProperty("bigDataUrl"),
            "displayMode": t.displayMode,
        }

        if ("vcfTabix" === format) {
            config.indexURL = config.url + ".tbi"
        }

        if (t.hasProperty("longLabel") && t.hasProperty("html")) {
            if (config.description) config.description += "<br/>"
            config.description =
                `<a target="_blank" href="${t.getProperty("html")}">${t.getProperty("longLabel")}</a>`
        } else if (t.hasProperty("longLabel")) {
            config.description = t.getProperty("longLabel")
        }

        if (t.hasProperty("autoScale")) {
            config.autoscale = t.getProperty("autoScale").toLowerCase() === "on"
        }
        if (t.hasProperty("maxHeightPixels")) {
            const tokens = t.getProperty("maxHeightPixels").split(":")
            config.maxHeight = Number.parseInt(tokens[0])
            config.height = Number.parseInt(tokens[1])
            config.minHeight = Number.parseInt(tokens[2])
        }
        // TODO -- graphTypeDefault
        // TODO -- windowingFunction
        if (t.hasProperty("color")) {
            const c = t.getProperty("color")
            config.color = c.indexOf(",") > 0 ? `rgb(${c})` : c
        }
        if (t.hasProperty("altColor")) {
            const c = t.getProperty("altColor")
            config.altColor = c.indexOf(",") > 0 ? `rgb(${c})` : c
        }
        if (t.hasProperty("viewLimits")) {
            const tokens = t.getProperty("viewLimits").split(":")
            let min, max
            if (tokens.length > 1) {
                min = Number.parseInt(tokens[0])
                max = Number.parseInt(tokens[1])
            }
            if (Number.isNaN(max) || Number.isNaN(min)) {
                console.warn(`Unexpected viewLimits value in track line: ${properties["viewLimits"]}`)
            } else {
                config.min = min
                config.max = max
            }

        }
        if (t.hasProperty("itemRgb")) {
            // TODO -- this not supported yet
        }
        if ("hide" === t.getProperty("visibility")) {
            // TODO -- this not supported yet
            config.visible = false
        }
        if (t.hasProperty("url")) {
            config.infoURL = t.getProperty("url")
        }
        if (t.hasProperty("searchIndex")) {
            config.searchIndex = t.getProperty("searchIndex")
        }
        if (t.hasProperty("searchTrix")) {
            config.trixURL = t.getProperty("searchTrix")
        }
        if (t.hasProperty("html")) {
            config.html = t.getProperty("html")
        }

        if (t.hasProperty("group")) {
            config._group = t.getProperty("group")
            if (this.groupPriorityMap && this.groupPriorityMap.has(config._group)) {
                const nextPriority = this.groupPriorityMap.get(config._group) + 1
                config.order = nextPriority
                this.groupPriorityMap.set(config._group, nextPriority)
            }
        }

        if (t.hasProperty("metadata")) {
            config.attributes = parseMetadata(t.getProperty("metadata"))
        }

        if (t.hasProperty("maxWindowToDraw")) {
            let maxWindowToDraw = parseInt(t.getProperty("maxWindowToDraw"), 10)
            if (maxWindowToDraw > Number.MAX_SAFE_INTEGER) {
                maxWindowToDraw = Number.MAX_SAFE_INTEGER
            }
            config.visibilityWindow = maxWindowToDraw
        }

        // IGV does not support "maxWindowCoverage" in the same way as UCSC. Use to limit visibility window
        if (t.hasProperty("maxWindowCoverage")) {
            let maxWindowToDraw = parseInt(t.getProperty("maxWindowCoverage"), 10)
            if (maxWindowToDraw > Number.MAX_SAFE_INTEGER) {
                maxWindowToDraw = Number.MAX_SAFE_INTEGER
            }
            config.visibilityWindow = maxWindowToDraw
        }

        return config
    }
}

function htmlText(html) {
    // Assumes a pattern like <span style="color:#C58DAA">Digestive</span>
    const idx1 = html.indexOf('>')
    const idx2 = html.indexOf('<', idx1)
    if (idx1 > 0 && idx2 > idx1) {
        return html.substring(idx1 + 1, idx2)
    } else {
        return html
    }
}

/**
 * Return the priority for the group. The priority format is uncertain, but extends to at least 2 levels (e.g. 3.4).
 * Ignore levels > 3
 *
 * @param {string} priorityString Priority as a string (e.g. 3.4)
 * @return {number} A priority as an integer
 */
function getPriority(priorityString) {
    try {
        const tokens = priorityString.trim().split(".")
        let p = parseInt(tokens[0], 10) * 100
        if (tokens.length > 1) {
            p += parseInt(tokens[1], 10) * 10
        }
        if (tokens.length > 2) {
            p += parseInt(tokens[2], 10)
        }
        return p
    } catch (e) {
        console.error(`Error parsing priority string: ${priorityString}`, e)
        return Number.MAX_SAFE_INTEGER
    }
}

function parseMetadata(metadata) {
    const attrs = new Map()
    let lastMetdataLengh = -1
    while (metadata && metadata.length > 0) {
        try {
            if (metadata.length === lastMetdataLengh) {
                break
            }
            lastMetdataLengh = metadata.length
            let idx = metadata.indexOf("=")
            if (idx === -1 || idx === metadata.length - 1) {
                break
            }
            let idx2
            const key = StringUtils.capitalize(StringUtils.stripQuotes(metadata.substring(0, idx)))
            let value

            if (metadata.charAt(idx + 1) === '"') {
                idx++
                idx2 = metadata.indexOf('" ', idx + 1)
                value = idx2 > 0 ? metadata.substring(idx + 1, idx2) : metadata.substring(idx + 1)
                idx2++
            } else {
                idx2 = metadata.indexOf(" ", idx + 1)
                if (idx2 === -1) {
                    idx2 = metadata.length
                }
                value = metadata.substring(idx + 1, idx2)
            }
            value = StringUtils.stripQuotes(value)
            if (value.endsWith('"')) {
                value = value.substring(0, value.length - 1)
            }
            if (value.startsWith("<") && value.endsWith(">")) {
                value = htmlText(value)
            }
            attrs.set(key, value)
            if (idx2 === metadata.length) {
                break
            }
            metadata = idx2 > 0 ? metadata.substring(idx2 + 1).trim() : ""
        } catch (e) {
            // We don't want to fail parsing the hub due to a failure parsing metadata. Also, we don't want to
            // overwhelm the log. Metadata is of marginal importance in IGV.
        }
    }
    return attrs
}

export {parseMetadata}
export default TrackDbHub