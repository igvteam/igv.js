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

/**
 * Created by jrobinso on 10/10/16.
 */


var igv = (function (igv) {


    igv.CustomServiceReader = function (config) {
        this.config = config;

        this.supportsWholeGenome = true;
    }

    igv.CustomServiceReader.prototype.readFeatures = function (chr, start, end) {


        var self = this,
            url = self.config.url,
            body = self.config.body;

        if (chr.toLowerCase() !== "all") {

            url = url
                .replace("$CHR", chr)
                .replace("$START", start)
                .replace("$END", end);

            if (body !== undefined) {
                self.config.body =
                    self.config.body
                        .replace("$CHR", chr)
                        .replace("$START", start)
                        .replace("$END", end);
            }
        }

        return igv.xhr.load(url, self.config).then(function (data) {

            if (data) {

                var results = (typeof self.config.parser === "function") ? self.config.parser(data) : data;

                return results;

            }
            else {
                return null;
            }

        })
    }


    return igv;

})(igv || {});
