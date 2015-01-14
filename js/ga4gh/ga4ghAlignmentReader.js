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


    igv.Ga4ghAlignmentReader = function (config) {

        this.config = config;
        this.url = config.url;
        this.entityId = config.entityId || config.readsetId;
        this.authKey = config.authKey || 'AIzaSyC-dujgw4P1QvNd8i_c-I-S_P1uxVZzn0w';  // Default only works for localhost & broadinstitute.org
        this.endpoint = "reads";
        this.decode = igv.decodeGa4ghReads;

    }


    igv.Ga4ghAlignmentReader.prototype.readFeatures = function (chr, bpStart, bpEnd, success, task) {

        var queryChr = (chr.startsWith("chr") ? chr.substring(3) : chr),    // TODO -- we need to read the readset header and create an alias table
            readURL,
            body = {
                "readGroupSetIds": [this.entityId],
                "referenceName": queryChr,
                "start": bpStart,
                "end": bpEnd,
                "pageSize": "10000"
            },
            decode = this.decode;

        readURL = this.url + "/" + this.endpoint + "/search";
        if (this.authKey) {
            readURL = readURL + "?key=" + this.authKey;

            if (this.endpoint === "variants") {
                readURL += "&fields=nextPageToken,variants(alternateBases,filter,info,names,quality,referenceBases,referenceName,start)";
            }
        }

        igv.ga4ghSearch(readURL, body, decode, success, task);

    }


    return igv;

})(igv || {});