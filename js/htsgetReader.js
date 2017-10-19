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

    igv.HtsgetReader = function (config) {
        this.config = config;
    };

    igv.HtsgetReader.prototype.readAlignments = function (chr, start, end) {
        var self = this,
            url = this.config.url + this.config.id +
                '?referenceName=' + chr +
                '&start=' + start +
                '&end=' + end;

        return new Promise(function (fulfill, reject) {
            igv.xhr.loadJson(url, self.config)
                .then(function (data) {
                    if (data && data.htsget && data.htsget.urls) {

                        console.log('htsget-data:', data);

                        loadUrls(data.htsget.urls)
                            .then(function(dataArr) {
                                var alignmentContainer;
                                console.log('blobs: ', dataArr);

                                // TODO: decode bam

                                fulfill(dataArr);
                                // fulfill(alignmentContainer)
                            })
                            .catch(function(error) {
                                reject(error);
                            });
                    } else {
                        fulfill(null);
                    }
                })
                .catch(function (error) {
                    reject(error);
                });
        });
    };

    function loadUrls(urls) {
        var promiseArray = [];
        urls.forEach(function(urlData) {
            if (urlData.url.startsWith('data:')) {
                // this is a data-uri
                promiseArray.push(Promise.resolve(dataUriToBytes(urlData.url)));
            } else {
                var options = {};

                if (urlData.headers) {
                    options.headers = urlData.headers;
                }

                promiseArray.push(igv.xhr.load(urlData.url, options));
            }
        });
        return Promise.all(promiseArray);
    }

    function dataUriToBytes(dataUri) {
        var bytes,
            split = dataUri.split(','),
            info = split[0].split(':')[1],
            dataString = split[1];

        if (info.indexOf('base64') >= 0) {
            dataString = atob(dataString);
        } else {
            dataString = decodeURI(dataString);
        }

        bytes = new Uint8Array(dataString.length);
        for (var i = 0; i < dataString.length; i++) {
            bytes[i] = dataString.charCodeAt(i);
        }

        return bytes;

        // return new Blob([bytes], {type: 'application/octet-stream'});
    }


    return igv;
})(igv || {});
