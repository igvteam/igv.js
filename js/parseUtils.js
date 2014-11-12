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

/**
 * Created by turner on 2/17/14.
 */
var igv = (function (igv) {

    igv.isBlank = function (line) {

        var meh = line.match(/\S+/g);
        return !meh;
    };

    igv.isComment = function (line) {

        var index = line.indexOf("#");
        return 0 == index;
    };


    /**
     * Parse the document url query string for the entered parameter.
     *
     * @param name
     * @returns {*}
     */
    igv.getQueryValue = function (name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + name + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(window.location.href);
        if (results == null)
            return undefined;
        else
            return results[1];
    };


    igv.inferFileType = function (path) {

        var fn = path.toLowerCase();
        if(fn.endsWith(".gz")) {
            fn = fn.substr(0, fn.length-3);
        } else if(fn.endsWith(".txt") || fn.endsWith(".tab")) {
            fn = fn.substr(0, fn.length-4);
        }

        if (fn.endsWith(".vcf") || fn.endsWith(".vcf.gz")) {
            return "vcf";
        } else if (fn.endsWith(".narrowpeak")) {
            return "narrowPeak";
        } else if (fn.endsWith(".broadpeak")) {
            return "broadPeak";
        } else if (fn.endsWith(".bedgraph")) {
            return "bedgraph";
        } else if (fn.endsWith(".wig")) {
            return "wig";
        } else if (path.endsWith(".bed")) {
            return "bed";
        } else if (path.endsWith(".seg")) {
            return "seg";
        } else if (path.endsWith(".bam")) {
            return "bam"
        } else if (path.endsWith(".bw") || path.endsWith(".bigwig")) {
            return "bigwig"
        } else if (path.endsWith(".bb") || path.endsWith(".bigbed")) {
            return "bigwig"
        } else {
            return null;
        }
    }


    return igv;
})(igv || {});
