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

        fileInfoCache: {},

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

                var acToken = igv.oauth.google.access_token;
                if (!acToken && typeof oauth !== "undefined") {
                    // Check legacy variable
                    acToken = oauth.google.access_token;
                }
                if (acToken && !headers.hasOwnProperty("Authorization")) {
                    headers["Authorization"] = "Bearer " + acToken;
                }

                return headers;

            }
        },

        addApiKey: function (url) {

            var apiKey = igv.oauth.google.apiKey,
                paramSeparator = url.includes("?") ? "&" : "?";

            if (apiKey !== undefined && !url.includes("key=")) {
                if (apiKey) {
                    url = url + paramSeparator + "key=" + apiKey;
                }
            }
            return url;
        },

        driveDownloadURL: function (link) {
            var i1, i2, id;
            // Return a google drive download url for the sharable link
            //https://drive.google.com/open?id=0B-lleX9c2pZFbDJ4VVRxakJzVGM
            //https://drive.google.com/file/d/1_FC4kCeO8E3V4dJ1yIW7A0sn1yURKIX-/view?usp=sharing

            var id = getGoogleDriveFileID(link);

            return id ? "https://www.googleapis.com/drive/v3/files/" + id + "?alt=media" : link;
        },

        getDriveFileInfo: function (googleDriveURL) {

            var id = getGoogleDriveFileID(googleDriveURL),
                endPoint = "https://www.googleapis.com/drive/v2/files/" + id;

            return igv.xhr.loadJson(endPoint, igv.buildOptions({}));
        },

        loadGoogleProperties: function (propertiesURL) {

            return igv.xhr.loadArrayBuffer(propertiesURL)
                .then(function (arrayBuffer) {
                    var inflate, plain, str;

                    inflate = new Zlib.Gunzip(new Uint8Array(arrayBuffer));
                    plain = inflate.decompress();
                    str = String.fromCharCode.apply(null, plain);
                    igv.Google.properties = JSON.parse(str);

                    return igv.Google.properties;

                })
        }
    }


    igv.oauth = {
        google: {}
    };


    function getGoogleDriveFileID(link) {

        //https://drive.google.com/file/d/1_FC4kCeO8E3V4dJ1yIW7A0sn1yURKIX-/view?usp=sharing
        var i1, i2;

        if (link.includes("/open?id=")) {
            i1 = link.indexOf("/open?id=") + 9;
            i2 = link.indexOf("&");
            if (i1 > 0 && i2 > i1) {
                return link.substring(i1, i2)
            }
            else if (i1 > 0) {
                return link.substring(i1);
            }

        }
        else if (link.includes("/file/d/")) {
            i1 = link.indexOf("/file/d/") + 8;
            i2 = link.lastIndexOf("/");
            return link.substring(i1, i2);
        }
    }

    return igv;

})(igv || {});

