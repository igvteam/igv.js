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

        igv.BamUtils.setReaderDefaults(this, config);
    };

    igv.HtsgetReader.prototype.readAlignments = function (chr, start, end) {

        var self = this;

        return getHeader()

            .then(function (header) {

                var queryChr, url;

                queryChr = header.chrAliasTable.hasOwnProperty(chr) ? header.chrAliasTable[chr] : chr;

                url = self.config.endpoint + '/reads/' + self.config.id +
                    '?referenceName=' + queryChr +
                    '&start=' + start +
                    '&end=' + end;

                return igv.xhr.loadJson(url, self.config)
            })
            .then(function (data) {
                return loadUrls(data.htsget.urls)
            })
            .then(function (dataArr) {

                var compressedData, unc, ba, alignmentContainer, chrIdx;

                compressedData = concatArrays(dataArr);  // In essence a complete bam file
                unc = igv.unbgzf(compressedData.buffer);
                ba = new Uint8Array(unc);


                chrIdx = self.header.chrToIndex[chr];
                alignmentContainer = new igv.AlignmentContainer(chr, start, end, self.samplingWindowSize, self.samplingDepth, self.pairsSupported);

                igv.BamUtils.decodeBamRecords(ba, self.header.size, alignmentContainer, self.header.chrNames, chrIdx, start, end);

                alignmentContainer.finish()
                return alignmentContainer;
            })


        function getHeader() {

            if (self.header) {
                return Promise.resolve(self.header);
            }
            else {

                // htsget does not specify a method to get the header alone.  specify a non-sensical range
                // to return just the header

                var url = self.config.endpoint + '/reads/' + self.config.id + '?referenceName=noSuchReference';

                return igv.xhr.loadJson(url, self.config)

                    .then(function (data) {

                        var genome = igv.browser ? igv.browser.genome : undefined;

                        if (data && data.htsget && data.htsget.urls) {

                            return loadUrls(data.htsget.urls)

                                .then(function (dataArr) {

                                    var compressedData, unc, ba, alignmentContainer, chrIdx;

                                    compressedData = concatArrays(dataArr);  // In essence a complete bam file
                                    unc = igv.unbgzf(compressedData.buffer);
                                    ba = new Uint8Array(unc);

                                    self.header = igv.BamUtils.decodeBamHeader(ba, genome);

                                    return self.header;
                                });
                        }
                        else {
                            throw new Error("Error querying htsget: " + headerUrl);
                        }
                    });

            }

        }

    }


    function loadUrls(urls) {
        var promiseArray = [];
        urls.forEach(function (urlData) {
            if (urlData.url.startsWith('data:')) {
                // this is a data-uri
                promiseArray.push(Promise.resolve(dataUriToBlob(urlData.url)));
            } else {
                var options = {};

                if (urlData.headers) {
                    options.headers = urlData.headers;
                    if (options.headers.hasOwnProperty("referer")) {
                        delete options.headers["referer"];
                    }
                }

                promiseArray.push(new Promise(function (fulfill, reject) {
                    igv.xhr.loadArrayBuffer(urlData.url, options)
                        .then(function (buffer) {
                            fulfill(new Uint8Array(buffer));
                        });
                }));
            }
        });
        return Promise.all(promiseArray);
    }

    /**
     * Concatenate a list of Uint8Arrays
     * @param arrays
     */
    function concatArrays(arrays) {

        var len, newArray, offset;
        len = 0;
        arrays.forEach(function (a) {
            len += a.length;
        });

        offset = 0;
        newArray = new Uint8Array(len);
        arrays.forEach(function (a) {
            newArray.set(a, offset);
            offset += a.length;
        });

        return newArray;

    }

    function dataUriToBlob(dataUri) {
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
        //return new Blob([bytes], {type: 'application/octet-stream'});
    }


    return igv;
})
(igv || {});
