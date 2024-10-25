/*
 https://genomewiki.ucsc.edu/index.php/Assembly_Hubs
 https://genome.ucsc.edu/goldenpath/help/hgTrackHubHelp.html
 https://genome.ucsc.edu/goldenPath/help/hgTrackHubHelp
 https://genome.ucsc.edu/goldenpath/help/trackDb/trackDbHub.html
 */


class Hub {

    static supportedTypes = new Set(["bigBed", "bigWig", "bigGenePred", "vcfTabix"])
    static filterTracks = new Set(["cytoBandIdeo", "assembly", "gap", "gapOverlap", "allGaps",
        "cpgIslandExtUnmasked", "windowMasker"])

    static async loadHub(url) {

        const idx = url.lastIndexOf("/")
        const baseURL = url.substring(0, idx + 1)
        const stanzas = await loadStanzas(url)
        let groups
        if ("genome" === stanzas[1].type) {
            const genome = stanzas[1]
            if (genome.hasProperty("groups")) {
                const groupsTxtURL = baseURL + genome.getProperty("groups")
                groups = await loadStanzas(groupsTxtURL)
            }

            // If the genome has a chromSizes file, and it is not too large, set the chromSizesURL property.  This will
            // enable whole genome view and the chromosome pulldown
            if (genome.hasProperty("chromSizes")) {
                const chromSizesURL = baseURL + genome.getProperty("chromSizes")
                const l = await getContentLength(chromSizesURL)
                if (l !== null && Number.parseInt(l) < 1000000) {
                    genome.setProperty("chromSizesURL", chromSizesURL)
                }
            }
        }

        // TODO -- categorize extra "user" supplied and other tracks in some distinctive way before including them
        // load includes.  Nested includes are not supported
        // for (let s of stanzas.slice()) {
        //     if ("include" === s.type) {
        //         const includeStanzas = await loadStanzas(baseURL + s.getProperty("include"))
        //         for (s of includeStanzas) {
        //             s.setProperty("visibility", "hide")
        //             stanzas.push(s)
        //         }
        //     }
        // }

        return new Hub(url, stanzas, groups)
    }

    constructor(url, stanzas, groupStanzas) {

        this.url = url

        const idx = url.lastIndexOf("/")
        this.baseURL = url.substring(0, idx + 1)

        // The first stanza must be type = hub
        if ("hub" === stanzas[0].type) {
            this.hubStanza = stanzas[0]
        } else {
            throw Error("Unexpected hub.txt file -- does the first line start with 'hub'?")
        }
        if ("on" !== this.hubStanza.getProperty("useOneFile")) {
            throw Error("Only 'useOneFile' hubs are currently supported")
        }
        if (stanzas.length < 2) {
            throw Error("Expected at least 2 stanzas, hub and genome")
        }

        // The second stanza should be a genome
        if ("genome" === stanzas[1].type) {
            this.genomeStanza = stanzas[1]
        } else {
            throw Error(`Unexpected hub file -- expected "genome" stanza but found "${stanzas[1].type}"`)
        }

        // Remaining stanzas should be tracks
        this.trackStanzas = []
        for (let i = 2; i < stanzas.length; i++) {
            if ("track" === stanzas[i].type) {
                this.trackStanzas.push(stanzas[i])
            }
        }

        if (groupStanzas) {
            this.groupStanzas = groupStanzas
            this.groupPriorityMap = new Map()
            for (let g of groupStanzas) {
                if (g.hasProperty("priority")) {
                    this.groupPriorityMap.set(g.getProperty("name"), Number.parseInt(g.getProperty("priority")) * 10)
                }
            }
        }
    }

    getDefaultPosition() {
        return this.genomeStanza.getProperty("defaultPos")
    }

    /*  Example genome stanza
genome GCF_000186305.1
taxId 176946
groups groups.txt
description Burmese python
twoBitPath GCF_000186305.1.2bit
twoBitBptURL GCF_000186305.1.2bit.bpt
chromSizes GCF_000186305.1.chrom.sizes.txt
chromAliasBb GCF_000186305.1.chromAlias.bb
organism Python_molurus_bivittatus-5.0.2 Sep. 2013
defaultPos NW_006532014.1:484194-494194
scientificName Python bivittatus
htmlPath html/GCF_000186305.1_Python_molurus_bivittatus-5.0.2.description.html
blat dynablat-01.soe.ucsc.edu 4040 dynamic GCF/000/186/305/GCF_000186305.1
transBlat dynablat-01.soe.ucsc.edu 4040 dynamic GCF/000/186/305/GCF_000186305.1
isPcr dynablat-01.soe.ucsc.edu 4040 dynamic GCF/000/186/305/GCF_000186305.1
 */

    getGenomeConfig(options = {}) {
        // TODO -- add blat?  htmlPath?

        const id = this.genomeStanza.getProperty("genome")
        const gsName =
            this.hubStanza.getProperty("shortLabel") ||
            this.genomeStanza.getProperty("scientificName") ||
            this.genomeStanza.getProperty("organism") ||
            this.genomeStanza.getProperty("description")
        const name = gsName + (gsName ? ` (${id})` : ` ${id}`)

        const config = {
            hubURL: this.url,
            id: id,
            name: name,
            twoBitURL: this.baseURL + this.genomeStanza.getProperty("twoBitPath"),
            nameSet: "ucsc",
        }

        if (this.genomeStanza.hasProperty("chromSizesURL")) {
            config.chromSizesURL = this.genomeStanza.getProperty("chromSizesURL")
        } else {
            config.wholeGenomeView = false
            config.showChromosomeWidget = false
        }

        if (this.genomeStanza.hasProperty("defaultPos")) {
            const hubLocus = this.genomeStanza.getProperty("defaultPos")
            // Strip out coordinates => whole chromosome view
            if (hubLocus) {
                const idx = hubLocus.lastIndexOf(":")
                config.locus = idx > 0 ? hubLocus.substring(0, idx) : hubLocus
            }
        }

        if (this.genomeStanza.hasProperty("blat")) {
            config.blat = this.baseURL + this.genomeStanza.getProperty("blat")
        }
        if (this.genomeStanza.hasProperty("chromAliasBb")) {
            config.chromAliasBbURL = this.baseURL + this.genomeStanza.getProperty("chromAliasBb")
        }
        if (this.genomeStanza.hasProperty("chromAlias")) {
            config.aliasURL = this.baseURL + this.genomeStanza.getProperty("chromAlias")
        }
        if (this.genomeStanza.hasProperty("twoBitBptURL")) {
            config.twoBitBptURL = this.baseURL + this.genomeStanza.getProperty("twoBitBptURL")
        }

        if (this.genomeStanza.hasProperty("twoBitBptUrl")) {
            config.twoBitBptURL = this.baseURL + this.genomeStanza.getProperty("twoBitBptUrl")
        }

        // chromSizes can take a very long time to load, and is not useful with the default WGV = off
        if (options.includeChromSizes && this.genomeStanza.hasProperty("chromSizes")) {
            config.chromSizesURL = this.baseURL + this.genomeStanza.getProperty("chromSizes")
        }

        if (this.hubStanza.hasProperty("longLabel")) {
            config.description = this.hubStanza.getProperty("longLabel").replace("/", "\n")
        } else {
            config.description = config.id
            if (this.genomeStanza.hasProperty("description")) {
                config.description += `\n${this.genomeStanza.getProperty("description")}`
            }
            if (this.genomeStanza.hasProperty("organism")) {
                config.description += `\n${this.genomeStanza.getProperty("organism")}`
            }
            if (this.genomeStanza.hasProperty("scientificName")) {
                config.description += `\n${this.genomeStanza.getProperty("scientificName")}`
            }

            if (this.genomeStanza.hasProperty("htmlPath")) {
                config.infoURL = this.baseURL + this.genomeStanza.getProperty("htmlPath")
            }
        }

        // Search for cytoband
        /*
        track cytoBandIdeo
        shortLabel Chromosome Band (Ideogram)
        longLabel Ideogram for Orientation
        group map
        visibility dense
        type bigBed 4 +
        bigDataUrl bbi/GCA_004027145.1_DauMad_v1_BIUU.cytoBand.bb
         */
        const cytoStanza = this.trackStanzas.filter(t => "cytoBandIdeo" === t.name && t.hasProperty("bigDataUrl"))
        if (cytoStanza.length > 0) {
            config.cytobandBbURL = this.baseURL + cytoStanza[0].getProperty("bigDataUrl")
        }

        // Tracks.
        const filter = (t) => !Hub.filterTracks.has(t.name) && "hide" !== t.getProperty("visibility")
        config.tracks = this.#getTracksConfigs(filter)


        return config
    }

    getGroupedTrackConfigurations() {

        // Organize track configs by group
        const trackConfigMap = new Map()
        for (let c of this.#getTracksConfigs()) {
            if (c.name === "cytoBandIdeo") continue
            const groupName = c.group || "other"
            if (trackConfigMap.has(groupName)) {
                trackConfigMap.get(groupName).push(c)
            } else {
                trackConfigMap.set(groupName, [c])
            }
        }

        // Build group structure
        const groupStanazMap = this.groupStanzas ?
            new Map(this.groupStanzas.map(groupStanza => [groupStanza.getProperty("name"), groupStanza])) :
            new Map()

        return Array.from(trackConfigMap.keys()).map(groupName => {
            return {
                label: groupStanazMap.has(groupName) ? groupStanazMap.get(groupName).getProperty("label") : groupName,
                tracks: trackConfigMap.get(groupName)
            }
        })

    }

    /**
     * Return an array of igv track config objects that satisfy the filter
     */
    #getTracksConfigs(filter) {
        return this.trackStanzas.filter(t => {
            return Hub.supportedTypes.has(t.format) && t.hasProperty("bigDataUrl") && (!filter || filter(t))
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
            "url": this.baseURL + t.getProperty("bigDataUrl"),
            "displayMode": t.displayMode,
        }

        if ("vcfTabix" === format) {
            config.indexURL = config.url + ".tbi"
        }

        if (t.hasProperty("longLabel") && t.hasProperty("html")) {
            if (config.description) config.description += "<br/>"
            config.description =
                `<a target="_blank" href="${this.baseURL + t.getProperty("html")}">${t.getProperty("longLabel")}</a>`
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
            config.trixURL = this.baseURL + t.getProperty("searchTrix")
        }

        if (t.hasProperty("group")) {
            config.group = t.getProperty("group")
            if (this.groupPriorityMap && this.groupPriorityMap.has(config.group)) {
                const nextPriority = this.groupPriorityMap.get(config.group) + 1
                config.order = nextPriority
                this.groupPriorityMap.set(config.group, nextPriority)
            }
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
 * Return the content length of the resource.  If the content length cannot be determined return null;
 * @param url
 * @returns {Promise<number|string>}
 */
async function getContentLength(url) {
    try {
        const response = await fetch(url, {method: 'HEAD'})
        const headers = response.headers
        if (headers.has("content-length")) {
            return headers.get("content-length")
        } else {
            return null
        }
    } catch (e) {
        return null
    }
}

/**
 * Parse a UCSC  file
 * @param url
 * @returns {Promise<*[]>}
 */
async function loadStanzas(url) {

    const response = await fetch(url)
    const data = await response.text()
    const lines = data.split(/\n|\r\n|\r/g)

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
            const key = line.substring(indent, i).trim()
            if (key.startsWith("#")) continue
            const value = line.substring(i + 1).trim()
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


export {loadStanzas}
export default Hub
