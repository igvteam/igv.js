/**
 * Creates an IGV genome configuration json from a UCSC genark assembly hub.  It might also work with other
 * UCSC hubs but has not been tested.
 *
 * Example use
 * node hubToGenomeConfig.js GCF_002006095.1
 * node hubToGenomeConfig.js https://hgdownload.soe.ucsc.edu/hubs/GCF/002/006/095/GCF_002006095.1/hub.txt
 */

import Hub from "../js/ucsc/ucscHub.js"
import {convertToHubURL} from "../js/ucsc/ucscUtils.js"

if (process.argv.length !== 3) {
    console.log("Usage: node hubToGenomeConfig.js <hub accession or url to hub.text>")
}

const hubAccensionOrURL = process.argv[2]

let url
if (hubAccensionOrURL.startsWith("http://") || hubAccensionOrURL.startsWith("https://")) {
    url = hubAccensionOrURL
} else {
    url = convertToHubURL(hubAccensionOrURL)
}

if (!url) {
    console.error(`Could not convert input "${hubAccensionOrURL}" to genark hub url`)

}

const hub = await Hub.loadHub(url)

const config = hub.getGenomeConfig({includeChromSizes: true})

process.stdout.write(JSON.stringify(config, null, 2))

