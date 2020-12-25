/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 University of California San Diego
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
import {igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js";

const isString = StringUtils.isString;


class CustomServiceReader {
    constructor(config) {
        this.config = config;
    }

    async readFeatures(chr, start, end) {

        let url;
        if (typeof this.config.url === 'function') {
            url = this.config.url({chr, start, end});
        } else {
            url = this.config.url
                .replace("$CHR", chr)
                .replace("$START", start)
                .replace("$END", end);
        }

        let config = Object.assign({}, this.config);
        if (this.config.body !== undefined) {
            if (typeof this.config.body === 'function') {
                config.body = this.config.body({chr, start, end});
            } else {
                config.body =
                    this.config.body
                        .replace("$CHR", chr)
                        .replace("$START", start)
                        .replace("$END", end);
            }
        }


        let features;
        const data = await igvxhr.load(url, config)
        if (data) {
            if (typeof this.config.parser === "function") {
                features = this.config.parser(data);
            } else if (isString(data)) {
                    features = JSON.parse(data);
            } else {
                features = data;
            }
        }
        if (this.config.mappings) {
            let mappingKeys = Object.keys(this.config.mappings);
            for (let f of features) {
                for (let key of mappingKeys) {
                    f[key] = f[this.config.mappings[key]];
                }
            }
        }
        return features;
    }
}

export default CustomServiceReader
