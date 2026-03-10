/*
 https://genomewiki.ucsc.edu/index.php/Assembly_Hubs
 https://genome.ucsc.edu/goldenpath/help/hgTrackHubHelp.html
 https://genome.ucsc.edu/goldenPath/help/hgTrackHubHelp
 https://genome.ucsc.edu/goldenpath/help/trackDb/trackDbHub.html
 */

import Stanza from "./stanza.js"
import {igvxhr} from "../../../node_modules/igv-utils/src/index.js"

const urlProperties = new Set(["descriptionUrl", "desriptionUrl",
    "twoBitPath", "blat", "chromAliasBb", "twoBitBptURL", "twoBitBptUrl", "htmlPath", "bigDataUrl",
    "genomesFile", "trackDb", "groups", "include", "html", "searchTrix", "groups",
    "chromSizes"])


/**
 * Parse a UCSC  file
 * @param url
 * @returns {Promise<*[]>}
 */
async function loadStanzas(url) {

    const idx = url.lastIndexOf("/")
    const baseURL = url.substring(0, idx + 1)
    const host = getHost(url)

    //const response = await fetch(url)
    const data = await igvxhr.loadString(url, {})    //await response.text()
    const lines = data.split(/\n|\r\n|\r/g)

    const nodes = []
    let currentNode
    let startNewNode = true
    for (let i = 0; i < lines.length; i++) {

        let line = lines[i].trim()

        if (line.length == 0) {
            // Break - start a new node
            startNewNode = true
        } else {
            if (line.startsWith("#")) {
                continue
            }

            while (line.endsWith('\\')) {
                i++
                if (i >= lines.length) {
                    break
                }
                line = line.substring(0, line.length - 1) + lines[i].trim()
            }

            if (line.startsWith("include")) {
                const relativeURL = line.substring(8).trim()
                const includeURL = getDataURL(relativeURL, host, baseURL)
                const includeStanzas = await loadStanzas(includeURL)
                for (let s of includeStanzas) {
                    nodes.push(s)
                }
            }


            const index = line.indexOf(' ')
            const key = line.substring(0, index).trim()
            let value = line.substring(index + 1).trim()

            if (key === "type") {
                // The "type" property contains format and sometimes other information. For example, data range
                // on a bigwig "type bigWig 0 .5"
                const tokens = value.split(/\s+/)
                value = tokens[0]
                if (value === "bigWig" && tokens.length === 3) {
                    // This is a bigWig with a range
                    const min = tokens[1]
                    const max = tokens[2]
                    if (currentNode) {
                        currentNode.setProperty("min", min)
                        currentNode.setProperty("max", max)
                    }
                }

            } else if (!["shortLabel", "longLabel", "metadata", "label"].includes(key)) {
                const tokens = value.split(/\s+/)
                value = tokens[0]
            }

            if (urlProperties.has(key) || value.endsWith("URL") || value.endsWith("Url")) {
                value = getDataURL(value, host, baseURL)
            }

            if (startNewNode) {
                currentNode = new Stanza(key, value)
                nodes.push(currentNode)
                startNewNode = false
            }

            currentNode.setProperty(key, value)
        }
    }
    return resolveParents(nodes)
}

function firstWord(str) {
    const idx = str.indexOf(' ')
    return idx > 0 ? str.substring(0, idx) : str
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

function getDataURL(url, host, baseURL) {
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("gs://") || url.startsWith("s3://")) {
        return url
    } else if (url.startsWith("/")) {
        return host + url
    } else {
        return baseURL + url
    }
}

function getHost(url) {
    let host
    if (url.startsWith("https://") || url.startsWith("http://")) {
        try {
            const tmp = new URL(url)
            host = `${tmp.protocol}//${tmp.host}`
        } catch (e) {
            console.error("Error parsing base URL host", e)
            throw e
        }
    } else {
        host = ''
    }
    return host
}

export {loadStanzas}
