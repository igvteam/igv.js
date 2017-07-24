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
    /*
     * @constructor
     */
    igv.VariantLoader = function() {
    };

    igv.VariantLoader.loadFromDir = function(url, options) {
        return new Promise(function(fulfill, reject) {
            function parseData(data) {
                var dirPicker = $("#dirPicker"), filePicker = $("#filePicker"), i;
                dirPicker.empty();
                filePicker.empty();
                dirPicker.append("<option value='-2'>"+ url.substring(url.lastIndexOf('/')+1) + "</option>");
                if (!url.endsWith('static/data')) {
                    dirPicker.append("<option value='-1'>PARENT</option>");
                }
                for (i = 0; i < data.dirs.length; i++) {
                    dirPicker.append("<option value='"+i+"'>"+data.dirs[i].name+"</option>");
                }
                filePicker.append("<option value='-1'>--</option>");
                for (i = 0; i < data.files.length; i++) {
                    filePicker.append("<option value='"+i+"'>"+data.files[i].name+"</option>");
                }
                fulfill(data);
            }
            igvxhr
                .loadJson(url, options)
                .then(parseData)
                .catch(reject);
        });
    };

    igv.VariantLoader.loadSelectedTrack = function() {
        var e = document.getElementById("filePicker");
        var data = igv.currData['data'];
        if (e.value >= 0 && e.value < data.files.length) {
            igv.browser.loadTrack({
                url: data.files[e.value].path,
                indexed: true,
                name: data.files[e.value].displayName,
                visibilityWindow: 100000, // 100 k
                height: 500,
                oauth: 'google'
            });
        }
    };

    igv.VariantLoader.loadNewDir = function() {
        var e = document.getElementById("dirPicker"), url;
        var data = igv.currData['data'];
        if (e.value == -1) {
            url = igv.currData['url'].substring(0, igv.currData['url'].lastIndexOf('/'));
            igv.VariantLoader.loadFromDir(url, {method: 'GET'}).then(function(data) {
                igv.currData = {data: data, url: url};
            });
        }
        else if (e.value >= 0) {
            url = igv.currData['url'] + "/" + data.dirs[e.value].name;
            igv.VariantLoader.loadFromDir(url, {method: 'GET'}).then(function(data) {
                igv.currData = {data: data, url: url};
            });
        }

    };

    igv.setupFlaskBrowser = function() {
        var url = '/data/static/data';
        igv.VariantLoader.loadFromDir(url, {method: 'GET'}).then(function(data) {
            console.log('data', data);
            igv.currData = {data: data, url: url};
        });
    };

    return igv;
})
(igv || {});