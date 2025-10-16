import {FileUtils, igvxhr} from "../../node_modules/igv-utils/src/index.js"
import {buildOptions} from "../util/igvUtils.js"

class HtsgetReader {

    constructor(config, genome) {
        this.config = config
        this.genome = genome
        if (config.format) {
            this.format = config.format.toUpperCase()
        } else {
            throw Error('Format is required, and must be either "bam" or "cram"')
        }
        if (!(this.format === "BAM" || this.format === "VCF")) {
            throw Error(`htsget format ${config.format} is not supported`)
        }
    }

    async readHeaderData() {
        const url = `${getUrl(this.config)}?class=header&format=${this.format}`
        const ticket = await igvxhr.loadJson(url, buildOptions(this.config))
        return await this.loadUrls(ticket.htsget.urls)
    }

    async readData(chr, start, end) {
        const url = `${getUrl(this.config)}?format=${this.format}&referenceName=${chr}&start=${Math.floor(start)}&end=${Math.ceil(end)}`
        const ticket = await igvxhr.loadJson(url, buildOptions(this.config))
        return this.loadUrls(ticket.htsget.urls)
    }

    async loadUrls(urls) {

        const promiseArray = []
        for (let urlData of urls) {

            if (urlData.url.startsWith('data:')) {
                // this is a data-uri
                promiseArray.push(Promise.resolve(dataUriToBytes(urlData.url)))

            } else {
                const options = {headers: urlData.headers || {}}
                promiseArray.push(igvxhr.loadArrayBuffer(urlData.url, options))
            }
        }
        const arrayBuffers = await Promise.all(promiseArray)
        return concatArrays(arrayBuffers)
    }


    static async inferFormat(config) {
        try {
            const url = getUrl(config)
            const headerURL = `${url}${url.includes("?") ? "&" : "?"}class=header`
            const ticket = await igvxhr.loadJson(headerURL, buildOptions(config))
            if (ticket.htsget) {
                const format = ticket.htsget.format
                if (!(format === "BAM" || format === "VCF")) {
                    throw Error(`htsget format ${format} is not supported`)
                }
                config.format = format.toLowerCase()
                config.sourceType = "htsget"
                if (!config.name) {
                    config.name = FileUtils.getFilename(config.url)
                }
            }
        } catch (e) {
            // Errors => this is not an htsget source, not an application error.  Ignore
        }
    }
}

/**
 * Extract the full url from the config.  Striving for backward compatibility, "endpoint" and "id" are deprecated.
 *
 * @param config
 */
function getUrl(config) {
    if (config.url && config.endpoint && config.id) {
        return config.url + config.endpoint + config.id    // Deprecated
    } else if (config.endpoint && config.id) {
        return config.endpoint + config.id                // Deprecated
    } else if (config.url) {
        if (config.url.startsWith("htsget://")) {
            return config.url.replace("htsget://", "https://")    // htsget -> http not supported
        } else {
            return config.url
        }
    } else {
        throw Error("Must specify either 'url', or 'endpoint' and 'id")
    }


}

/**
 * Concatenate a list of array buffers, returning an UInt8Array
 * @param arrayBuffers
 */
function concatArrays(arrayBuffers) {

    let len = 0
    for (let a of arrayBuffers) {
        len += a.byteLength
    }

    let offset = 0
    const newArray = new Uint8Array(len)
    for (let buf of arrayBuffers) {
        const a = new Uint8Array(buf)
        newArray.set(a, offset)
        offset += a.length
    }

    return newArray
}

function dataUriToBytes(dataUri) {

    const split = dataUri.split(',')
    const info = split[0].split(':')[1]
    let dataString = split[1]

    if (info.indexOf('base64') >= 0) {
        dataString = atob(dataString)
    } else {
        dataString = decodeURI(dataString)
    }

    const bytes = new Uint8Array(dataString.length)
    for (var i = 0; i < dataString.length; i++) {
        bytes[i] = dataString.charCodeAt(i)
    }

    return bytes
}


export default HtsgetReader