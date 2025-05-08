const parentOverrideProperties = new Set(["visibility", "priority", "group"])
const inheritableProperties = new Set([
    "group", "priority", "color", "altColor", "autoscale", "autoScale", "viewLimits",
    "negativeValues", "maxWindowToQuery", "transformFun", "windowingFunction",
    "yLineMark", "yLineOnOff", "graphTypeDefault", "interactUp", "interactMultiRegion",
    "endsVisible", "maxHeightPixels", "scoreMin", "scoreFilter", "scoreFilterLimits",
    "minAliQual", "bamColorTag", "bamColorMode", "bamGrayMode", "colorByStrand",
    "itemRgb", "html"
])


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
        if (this.properties.has("noInherit")) {
            return this.properties.get(key)
        } else if (this.parent && parentOverrideProperties.has(key) &&  this.parent.hasProperty(key)) {
            return this.parent.getProperty(key)
        } else if (this.properties.has(key)) {
            return this.properties.get(key)
        } else if (this.parent && inheritableProperties.has(key)) {
            return this.parent.getProperty(key)
        } else {
            return undefined
        }
    }

    hasProperty(key) {
        return this.getProperty(key) !== null && this.getProperty(key) !== undefined
    }

    hasOwnProperty(key) {
        return this.properties.has(key)
    }

    getOwnProperty(key) {
        return this.properties.get(key)
    }

    removeProperty(key) {
        this.properties.delete(key)
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


function firstWord(str) {
    const idx = str.indexOf(' ')
    return idx > 0 ? str.substring(0, idx) : str
}


export default Stanza
