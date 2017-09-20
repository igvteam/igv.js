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

var igv = (function (igv) {

    igv.Google = {

        // Crude test, this is conservative, nothing bad happens for a false positive
        isGoogleURL: function (url) {
            return url.includes("googleapis");
        },

        translateGoogleCloudURL: function (gsUrl) {

            var i, bucket, object, qIdx, objectString, paramString;

            i = gsUrl.indexOf('/', 5);
            qIdx = gsUrl.indexOf('?');

            if (i < 0) {
                console.log("Invalid gs url: " + gsUrl);
                return gsUrl;
            }

            bucket = gsUrl.substring(5, i);

            objectString = (qIdx < 0) ? gsUrl.substring(i + 1) : gsUrl.substring(i + 1, qIdx);
            object = encodeURIComponent(objectString);

            if (qIdx > 0) {
                paramString = gsUrl.substring(qIdx);
            }

            return "https://www.googleapis.com/storage/v1/b/" + bucket + "/o/" + object +
                (paramString ? paramString + "&alt=media" : "?alt=media");

        },

        addGoogleHeaders: function (headers) {
            {
                headers["Cache-Control"] = "no-cache";

                var acToken = oauth.google.access_token;
                if (acToken && !headers.hasOwnProperty("Authorization")) {
                    headers["Authorization"] = "Bearer " + acToken;
                }

                return headers;

            }
        },

        addApiKey: function (url) {

            var apiKey = oauth.google.apiKey,
                paramSeparator = url.includes("?") ? "&" : "?";

            if (apiKey !== undefined && !url.includes("key=")) {
                if (apiKey) {
                    url = url + paramSeparator + "key=" + apiKey;
                }
            }
            return url;
        }
    }

    return igv;

})(igv || {});

