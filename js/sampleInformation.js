/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014-2015 Broad Institute
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

import {igvxhr, StringUtils} from "../node_modules/igv-utils/src/index.js"
import {buildOptions} from "./util/igvUtils.js"

const splitLines = StringUtils.splitLines

class SampleInformation {
    constructor() {
        this.attributes = {}
        this.plinkLoaded = false
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
        this.plinkLoaded = true
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
    const si = new SampleInformation()
    return si.loadPlinkFile(url, config)
}

export default loadPlinkFile



