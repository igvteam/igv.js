/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
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

import { decodeGenePredExt } from "./decode/ucsc.js"
import DecodeError from "./decode/decodeError.js"

class FeatureParser {

    constructor(config) {

        this.config = config
        this.header = {}
        if (config.nameField) {
            this.header.nameField = config.nameField
        }

        this.skipRows = 0   // The number of fixed header rows to skip.  Override for specific types as needed

        if (config.decode) {
            this.decode = config.decode
            this.delimiter = config.delimiter || "\t"
        } else if (config.format) {
            this.header.format = config.format.toLowerCase()
            this.setDecoder()
        }

        if (!this.delimiter) {
            this.delimiter = "\t"
        }
    }

    async parseHeader(dataWrapper) {
        this.setDecoder()
        return this.header
    }

    async parseFeatures(dataWrapper) {

        const allFeatures = []
        const decode = this.decode
        const format = this.header.format
        const delimiter = this.delimiter || "\t"
        let i = 0
        let errorCount = 0
        let line
        while ((line = await dataWrapper.nextLine()) !== undefined) {
            i++
            if (i <= this.skipRows) continue

            const tokens = line.split(delimiter)
            if (tokens.length < 1) {
                continue
            }

            const feature = decode(tokens, this.header)

            if (feature instanceof DecodeError) {
                errorCount++
                if (errorCount > 0) {
                    console.error(`Error parsing line '${line}': ${feature.message}`)
                }
                continue
            }

            if (feature) {
                allFeatures.push(feature)
            }
        }

        return allFeatures
    }

    setDecoder() {
        this.decode = decodeGenePredExt
        this.delimiter = this.config.delimiter || /\s+/
        this.header.shift = 1
    }
}

export default FeatureParser
