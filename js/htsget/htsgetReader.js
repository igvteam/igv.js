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

import {igvxhr} from "../../node_modules/igv-utils/src/index.js"
import {buildOptions, getFilename} from "../util/igvUtils.js"

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
                    config.name = await getFilename(config.url)
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