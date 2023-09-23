import {buildOptions} from "../util/igvUtils.js"
import {igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"

/*
 https://genomewiki.ucsc.edu/index.php/Assembly_Hubs
 https://genome.ucsc.edu/goldenpath/help/hgTrackHubHelp.html
 https://genome.ucsc.edu/goldenPath/help/hgTrackHubHelp
 https://genome.ucsc.edu/goldenpath/help/trackDb/trackDbHub.html
 */

class Hub {

    static async loadHub(url, options) {

        options = options || {}
        const stanzas = await parseHub(url, options)
        return new Hub(url, stanzas)
    }

    static supportedTypes = new Set(["bigBed", "bigWig", "bigGenePred"])
    static filterTracks = new Set(["cytoBandIdeo", "assembly", "gap", "allGaps"])

    constructor(url, stanzas) {

        const idx = url.lastIndexOf("/")
        this.baseURL = url.substring(0, idx + 1)

        // The first stanza must be type = hub
        if ("hub" === stanzas[0].type) {
            this.hub = stanzas[0]
        } else {
            throw Error("Unexpected hub.txt file -- does the first line start with 'hub'?")
        }
        if ("on" !== this.hub.getProperty("useOneFile")) {
            throw Error("Only 'useOneFile' hubs are currently supported")
        }
        if (stanzas.length < 2) {
            throw Error("Expected at least 2 stanzas, hub and genome")
        }

        // The second stanza should be a genome
        if ("genome" === stanzas[1].type) {
            this.genome = stanzas[1]
        } else {
            throw Error(`Unexpected hub file -- expected "genome" stanza but found "${stanzas[1].type}"`)
        }

        // Remaining stanzas should be tracks
        this.trackStanzas = []
        for (let i = 2; i < stanzas.length; i++) {
            if ("track" === stanzas[i].type) {
                this.trackStanzas.push(stanzas[i])
            } else {
                console.warn(`Unexpected stanza type: ${stanzas[i].type}`)
            }
        }
    }

    getDefaultPosition() {
        return this.genome.getProperty("defaultPos")
    }

    getGenomeConfig(includeTracks = "all") {
        // TODO -- add blat?  htmlPath?
        const config = {
            id: this.genome.getProperty("genome"),
            name: this.genome.getProperty("organism"),
            twobitURL: this.baseURL + this.genome.getProperty("twoBitPath"),
            aliasBbURL: this.baseURL + this.genome.getProperty("chromAliasBb"),
            nameSet: "ucsc"
        }

        // Search for cytoband
        const cytoStanza = this.trackStanzas.filter(t => "cytoBandIdeo" === t.name && t.getProperty("bigDataUrl"))
        if (cytoStanza.length > 0) {
            config.cytobandBbURL = this.baseURL + cytoStanza[0].getProperty("bigDataUrl")
        }

        // Tracks.  To prevent loading tracks set `includeTracks` to false
        if (includeTracks) {
            config.tracks = this.getTracksConfigs(includeTracks)
        }

        return config
    }

    /**
     * Return collection of igv track config object, organized by "group*
     */
    getTracksConfigs(group) {
        return this.trackStanzas.filter(t => {
            return t.getProperty("visibility") !== "hide" &&
                Hub.supportedTypes.has(t.format) &&
                !Hub.filterTracks.has(t.name) &&
                t.hasProperty("bigDataUrl") &&
                ("all" === group || group === t.getProperty("group"))

        })
            .map(t => this.getTrack(t))
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
    getTrack(t) {

        const format = t.format

        const config = {
            "name": t.getProperty("shortLabel"),
            "format": format,
            "url": this.baseURL + t.getProperty("bigDataUrl"),
            "displayMode": t.displayMode,
        }

        const description = t.getProperty("html")
        if (description) {
            config.description = `<a target="_blank" href="${this.baseURL + t.getProperty("html")}">${t.getProperty("longLabel")}</a>`
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
            const tokens = t.getProperty("maxHeightPixels").split(":")
            config.max = Number.parseInt(tokens[0])
            if (tokens.length > 1) {
                config.min = Number.parseInt(tokens[1])
            }
        }
        if (t.hasProperty("itemRgb")) {
            // TODO -- this not supported yet
        }
        if ("hide" === t.getProperty("hide")) {
            // TODO -- this not supported yet
            config.visible = false
        }


        return config

    }
}

function firstWord(str) {
    const idx = str.indexOf(' ')
    return idx > 0 ? str.substring(0, idx) : str
}

class Stanza {

    properties = new Map()

    constructor(type, name) {
        this.type = type
        this.name = name
    }

    setProperty(key, value) {
        this.properties.set(key, value)
    }

    getProperty(key) {
        if (this.properties.has(key)) {
            return this.properties.get(key)
        } else if (this.parent) {
            return this.parent.getProperty(key)
        } else {
            return undefined
        }
    }

    hasProperty(key) {
        if (this.properties.has(key)) {
            return true
        } else if (this.parent) {
            return this.parent.hasProperty(key)
        } else {
            return false
        }
    }

    get format() {
        const type = this.getProperty("type")
        if (type) {
            // Trim extra bed qualifiers (e.g. bigBed + 4)
            return firstWord(type)
        }
        return undefined // unknown type
    }

    /**
     * IGV display mode
     */
    get displayMode() {
        let viz = this.getProperty("visibility")
        if (!viz) {
            return "COLLAPSED"
        } else {
            viz = viz.toLowerCase()
            switch (viz) {
                case "dense":
                    return "COLLAPSED"
                case "pack":
                    return "EXPANDED"
                case "squish":
                    return "SQUISHED"
                default:
                    return "COLLAPSED"
            }
        }
    }
}

/**
 * Parse a UCSC  file
 * @param url
 * @returns {Promise<*[]>}
 */
async function parseHub(url, options) {

    const data = await igvxhr.loadString(url, options)
    const lines = StringUtils.splitLines(data)

    const nodes = []
    let currentNode
    let startNewNode = true
    for (let line of lines) {
        const indent = indentLevel(line)
        const i = line.indexOf(' ', indent)
        if (i < 0) {
            // Break - start a new node
            startNewNode = true
        } else {

            const key = line.substring(indent, i)
            const value = line.substring(i + 1)
            if (startNewNode) {
                // Start a new node -- indent is currently ignored as igv.js does not support sub-tracks,
                // so track stanzas are flattened
                const newNode = new Stanza(key, value)
                nodes.push(newNode)
                currentNode = newNode
                startNewNode = false
            }
            currentNode.setProperty(key, value)
        }
    }

    return resolveParents(nodes)
}

function resolveParents(nodes) {
    const nodeMap = new Map()
    for (let n of nodes) {
        nodeMap.set(n.name, n)
    }
    for (let n of nodes) {
        if (n.properties.has("parent")) {
            const parentName = firstWord(n.properties.get("parent"))
            n.parent = nodeMap.get(parentName)
        }
    }
    return nodes
}

function indentLevel(str) {
    let level = 0
    for (level = 0; level < str.length; level++) {
        const c = str.charAt(level)
        if (c !== ' ' && c !== '\t') break
    }
    return level
}


export {parseHub}
export default Hub
