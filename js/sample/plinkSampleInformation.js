/**
 * This code is not currently used, it was aprt of an intern project.  Kept in case there are requests for
 * "plink" support.
 *
 */


import {igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import {buildOptions} from "../util/igvUtils.js"

const splitLines = StringUtils.splitLines

class PlinkSampleInformation {
    constructor() {
        this.attributes = {}
    }

    async loadPlinkFile(url, config) {

        if (!config) config = {}

        var options = buildOptions(config)    // Add oauth token, if any
        const data = await igvxhr.loadString(url, options)
        var lines = splitLines(data)

        for (let line of lines) {
            var line_arr = line.split(' ')
            this.attributes[line_arr[1]] = {
                familyId: line_arr[0],
                fatherId: line_arr[2],
                motherId: line_arr[3],
                sex: line_arr[4],
                phenotype: line_arr[5]
            }
        }
        return this
    }

    /**
     * Return the attributes for the given sample as a map-like object (key-value pairs)
     * @param sample
     */
    getAttributes(sample) {
        return this.attributes[sample]
    };

    getAttributeNames() {

        if (this.hasAttributes()) {
            return Object.keys(this.attributes[Object.keys(this.attributes)[0]])
        } else return []
    };

    hasAttributes() {
        return Object.keys(this.attributes).length > 0
    }
}

function loadPlinkFile(url, config) {
    const si = new PlinkSampleInformation()
    return si.loadPlinkFile(url, config)
}

export default loadPlinkFile



