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

var igv = (function (igv) {


    igv.Ga4ghReader = function (config) {
        this.url = config.url;
        this.proxy = config.proxy;
        this.readsetId = config.readsetId;
        this.authKey = config.authKey || 'AIzaSyC-dujgw4P1QvNd8i_c-I-S_P1uxVZzn0w';  // Default only works for localhost & broadinstitute.org

    }

    igv.Ga4ghReader.prototype.readAlignments = function (chr, bpStart, bpEnd, success, task) {

        var queryChr = (chr.startsWith("chr") ? chr.substring(3) : chr),    // TODO -- we need to read the readset header and create an alias table
            readURL,
            body = {"readGroupSetIds": [this.readsetId], "referenceName": queryChr, "start": bpStart, "end": bpEnd, "pageSize": "10000"},
            sendData,
            sendURL,
            alignments;

        readURL = this.url + "/reads/search";
        if (this.authKey) {
            readURL = readURL + "?key=" + this.authKey;
        }

        sendURL = this.proxy ? this.proxy : readURL;

        // Start the recursive load cycle.  Data is fetched in chunks, if more data is available a "nextPageToken" is returned.
        loadChunk();

        function loadChunk(pageToken) {

            if (pageToken) {
                body.pageToken = pageToken;
            }
            else {
                if (body.pageToken != undefined) delete body.pageToken;    // Remove previous page token, if any
            }

            sendData = this.proxy ?
                "url=" + readURL + "&data=" + JSON.stringify(body) :
                JSON.stringify(body);

            igvxhr.loadJson(sendURL,
                {
                    sendData: sendData,
                    task: task,
                    contentType: "application/json",
                    success: function (json) {
                        var nextPageToken, tmp;

                        if (json) {

                            tmp = igv.decodeGa4ghReads(json.alignments);
                            alignments = alignments ? alignments.concat(tmp) : tmp;

                            nextPageToken = json["nextPageToken"];

                            if (nextPageToken) {
                                loadChunk(nextPageToken);  // TODO -- these should be processed (downsampled) here
                            }
                            else {
                                success(alignments);
                            }


                        }
                        else {
                            success(alignments);
                        }

                    }
                });
        }


    }


    return igv;

})(igv || {});