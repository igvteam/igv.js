/*
 https://genomewiki.ucsc.edu/index.php/Assembly_Hubs
 https://genome.ucsc.edu/goldenpath/help/hgTrackHubHelp.html
 https://genome.ucsc.edu/goldenPath/help/hgTrackHubHelp
 https://genome.ucsc.edu/goldenpath/help/trackDb/trackDbHub.html
 */


import TrackDbHub from "./trackDbHub.js"
import {loadStanzas} from "./hubParser.js"

const idMappings = new Map([
    ["hg38", "GCF_000001405.40"],
    ["hg38_1kg", "GCF_000001405.40"],
    ["mm39", "GCF_000001635.27"],
    ["mm10", "GCF_000001635.26"],
    ["bosTau9", "GCF_002263795.1"],
    ["canFam4", "GCF_011100685.1"],
    ["canFam6", "GCF_000002285.5"],
    ["ce11", "GCF_000002985.6"],
    ["dm6", "GCF_000001215.4"],
    ["galGal6", "GCF_000002315.6"],
    ["gorGor6", "GCF_008122165.1"],
    ["macFas5", "GCA_000364345.1"],
    ["panTro6", "GCA_002880755.3"],
    ["rn6", "GCF_000001895.5"],
    ["rn7", "GCF_015227675.2"],
    ["sacCer3", "GCF_000146045.2"],
    ["sacCer2", "GCF_000146045.2"],
    ["susScr11", "GCF_000003025.6"],
    ["taeGut1", "GCF_000002275.3"],
    ["tetNig2", "GCF_000002275.3"],
    ["xenTro10", "GCF_000002035.6"],
    ["xenTro9", "GCF_000002035.6"],
    ["tair10", "GCF_000001735.4"],
])

class Hub {

    static supportedTypes = new Set(["bigBed", "bigWig", "bigGenePred", "vcfTabix"])
    static filterTracks = new Set(["cytoBandIdeo", "assembly", "gap", "gapOverlap", "allGaps",
        "cpgIslandExtUnmasked", "windowMasker"])

    constructor(url, hubStanza, genomeStanzas, trackStanzas, groupStanzas) {

        this.url = url
        this.hubStanza = hubStanza
        this.genomeStanzas = genomeStanzas
        this.trackStanzas = trackStanzas
        this.groupStanzas = groupStanzas
        this.cytobandStanza = null
        this.trackHubMap = new Map()

        // trackStanzas will not be null if this is a "onefile" hub
        if (trackStanzas) {
            const genomeId = genomeStanzas[0].getProperty("genome") // Assumption here this is a single genome hub
            this.trackHubMap.set(genomeId, new TrackDbHub(trackStanzas, groupStanzas))

            // Search for cytoband track.  This supports a special but important case -- Genark assembly hubs
            this.cytobandStanza = this.trackStanzas.find(t => t.name === "cytoBandIdeo" && t.hasProperty("bigDataUrl")) || null
        }
    }


    getName() {
        return this.hubStanza.getProperty("hub")
    }

    getShortLabel() {
        return this.hubStanza.getProperty("shortLabel")
    }

    getLongLabel() {
        return this.hubStanza.getProperty("longLabel")
    }

    getDescriptionUrl() {
        return this.hubStanza.getProperty("descriptionUrl")
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

    getGenomeConfig(genomeId) {

        const genomeStanza = genomeId ? this.genomeStanzas.find(s => s.getProperty("genome") === genomeId) : this.genomeStanzas[0]
        if (!genomeStanza) {
            throw new Error(`Genome not found in hub: ${genomeId}`)
        }
        return this.#getGenomeConfig(genomeStanza)
    }

    #getGenomeConfig(genomeStanza) {

        const id = genomeStanza.getProperty("genome")
        const gsName =
            this.hubStanza.getProperty("shortLabel") ||
            genomeStanza.getProperty("scientificName") ||
            genomeStanza.getProperty("organism") ||
            genomeStanza.getProperty("description")
        const name = gsName + (gsName ? ` (${id})` : ` ${id}`)

        const config = {

            id: id,
            name: name,
            twoBitURL: genomeStanza.getProperty("twoBitPath"),
            nameSet: "ucsc",
            hubs: [this.url]
        }

        if (genomeStanza.hasProperty("chromSizes")) {
            config.chromSizesURL = genomeStanza.getProperty("chromSizes")
        } else {
            config.wholeGenomeView = false
            config.showChromosomeWidget = false
        }

        if (genomeStanza.hasProperty("defaultPos")) {
            const hubLocus = genomeStanza.getProperty("defaultPos")
            // Strip out coordinates => whole chromosome view
            // if (hubLocus) {
            //     const idx = hubLocus.lastIndexOf(":")
            //     config.locus = idx > 0 ? hubLocus.substring(0, idx) : hubLocus
            // }
            config.locus = hubLocus
        }

        if (genomeStanza.hasProperty("blat")) {
            config.blat = genomeStanza.getProperty("blat")
        }
        if (genomeStanza.hasProperty("chromAliasBb")) {
            config.chromAliasBbURL = genomeStanza.getProperty("chromAliasBb")
        }
        if (genomeStanza.hasProperty("chromAlias")) {
            config.aliasURL = genomeStanza.getProperty("chromAlias")
        }
        if (genomeStanza.hasProperty("twoBitBptURL")) {
            config.twoBitBptURL = genomeStanza.getProperty("twoBitBptURL")
        }

        if (genomeStanza.hasProperty("twoBitBptUrl")) {
            config.twoBitBptURL = genomeStanza.getProperty("twoBitBptUrl")
        }

        if(this.cytobandStanza){
            config.cytobandBbURL = this.cytobandStanza.getProperty("bigDataUrl")
        }

        if (this.hubStanza.hasProperty("longLabel")) {
            config.description = this.hubStanza.getProperty("longLabel").replace("/", "\n")
        } else {
            config.description = config.id
            if (genomeStanza.hasProperty("description")) {
                config.description += `\n${genomeStanza.getProperty("description")}`
            }
            if (genomeStanza.hasProperty("organism")) {
                config.description += `\n${genomeStanza.getProperty("organism")}`
            }
            if (genomeStanza.hasProperty("scientificName")) {
                config.description += `\n${genomeStanza.getProperty("scientificName")}`
            }

            if (genomeStanza.hasProperty("htmlPath")) {
                config.infoURL = genomeStanza.getProperty("htmlPath")
            }
        }

        // Tracks.
        const filter = (t) => !Hub.filterTracks.has(t.name) && "hide" !== t.getProperty("visibility")
        config.tracks = this.#getTracksConfigs(filter)

        return config
    }

    async getGroupedTrackConfigurations(genomeId) {
        let trackHub = await this.#getTrackDbHub(genomeId)
        if (!trackHub && idMappings.has(genomeId)) {
            trackHub = await this.#getTrackDbHub(idMappings.get(genomeId))
        }
        if (!trackHub) {
            console.log(`Warning: no trackDB found for genomeId ${genomeId}.`)
        }
        return trackHub ? trackHub.getGroupedTrackConfigurations() : []
    }

    async #getTrackDbHub(genomeId) {
        let trackHub = this.trackHubMap.get(genomeId)
        if (!trackHub) {
            for (let stanza of this.genomeStanzas) {
                if (genomeId === stanza.getProperty("genome")) {
                    try {
                        const trackDbURL = stanza.getProperty("trackDb")
                        const trackStanzas = await loadStanzas(trackDbURL)
                        trackHub = new TrackDbHub(trackStanzas, this.groupStanzas)
                        this.trackHubMap.set(genomeId, trackHub)
                    } catch (error) {
                        console.error(`Error loading trackDb file: ${stanza.getProperty("trackDb")}`, error)
                    }
                    break
                }
            }
        }
        return trackHub
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
                console.warn(`Unexpected viewLimits value in track line: ${t.getProperty("viewLimits")}`)
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

        if (t.hasProperty("group")) {
            config._group = t.getProperty("group")
            if (this.groupPriorityMap && this.groupPriorityMap.has(config._group)) {
                const nextPriority = this.groupPriorityMap.get(config._group) + 1
                config.order = nextPriority
                this.groupPriorityMap.set(config._group, nextPriority)
            }
        }

        return config
    }

}

export default Hub
