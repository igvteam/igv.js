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


    igv.Ga4ghReader = function (url, readsetId, authKey, proxy) {

        this.url = url;
        this.readsetId = readsetId;
        this.authKey = authKey;
        this.proxy = proxy;

    }

    igv.Ga4ghReader.prototype.readAlignments = function (chr, bpStart, bpEnd, success, task) {

        var dataLoader,
            queryChr = (chr.startsWith("chr") ? chr.substring(3) : chr),
            readURL,
            body = {"readsetIds": [this.readsetId], "sequenceName": queryChr, "sequenceStart": bpStart, "sequenceEnd": bpEnd, "maxResults": "10000"},
            sendData,
            sendURL;

        readURL = this.url + "/reads/search";
        if (this.authKey) {
            readURL = readURL + "?key=" + this.authKey;
        }

        sendURL = this.proxy ? this.proxy : readURL;

        sendData = this.proxy ?
            "url=" + readURL + "&data=" + JSON.stringify(body) :
            JSON.stringify(body);

        igvxhr.loadJson(sendURL,
            {
                sendData: sendData,
                task: task,
                contentType: "application/json",
                success: function (json) {

                    if (json) {
                        // TODO -- deal with nextPageToken
                        success(igv.decodeGa4ghReads(json.reads));
                    }
                    else {
                        success(null);
                    }

                }
            });


    }


    return igv;

})(igv || {});