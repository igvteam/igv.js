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

var igv = (function (igv) {

    igv.UCSCServiceReader = function (config) {
        this.config = config;
    };

    igv.UCSCServiceReader.prototype.readFeatures = function (chr, start, end) {
        var self = this,
            url = this.config.url + '&table=' + this.config.tableName + '&chr=' + chr + '&start=' + start + '&end=' + end;

        return new Promise(function (fulfill, reject) {
            igv.xhr.loadJson(url, self.config)
                .then(function (data) {
                    if (data) {
                        data.forEach(function (json) {
                            decodeJson(json);
                        });
                        fulfill(data);
                    } else {
                        fulfill(null);
                    }
                })
                .catch(function (error) {
                    reject(error);
                });
        });
    };

    // TODO -- generalize
    function decodeJson(feature) {
        if(feature.start) feature.start = Number.parseInt(feature.start);
        if(feature.end)  feature.end = Number.parseInt(feature.end);
    }

    return igv;
})(igv || {});
