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

/**
 * Created by jrobinso on 11/10/17.
 */

/**
 * Reads an entire bam file
 */
var igv = (function (igv) {

    /**
     * Class for reading a bam file
     *
     * @param config
     * @constructor
     */
    igv.BamReaderNonIndexed = function (config, genome) {

        this.config = config;
        
        this.genome = genome;

        this.bamPath = config.url;

        this.isDataUri = igv.isString(config.url) && config.url.startsWith("data:");

        igv.BamUtils.setReaderDefaults(this, config);

    };


    // Return an alignment container
    igv.BamReaderNonIndexed.prototype.readAlignments = function (chr, bpStart, bpEnd) {

        const self = this;
        const genome = this.genome;
        
        if (this.alignmentCache) {

            return fetchAlignments(chr, bpStart, bpEnd);
        }

        else {

            if(this.isDataUri)  {

                var data =  decodeDataURI(this.bamPath);
                var unc = igv.unbgzf(data.buffer);
                parseAlignments(new Uint8Array(unc));
                return Promise.resolve(fetchAlignments(chr, bpStart, bpEnd));
            }
            else {
                return igv.xhr.loadArrayBuffer(self.bamPath, igv.buildOptions(self.config))

                    .then(function (arrayBuffer) {

                        var unc = igv.unbgzf(arrayBuffer);

                        parseAlignments(new Uint8Array(unc));

                        return fetchAlignments(chr, bpStart, bpEnd);

                    });
            }

        }

        function parseAlignments(data) {

            var alignments = [];

            self.header = igv.BamUtils.decodeBamHeader(data);

            igv.BamUtils.decodeBamRecords(data, self.header.size, alignments, self.header.chrNames);

            self.alignmentCache = new igv.FeatureCache(alignments, genome);
        }


        function fetchAlignments(chr, bpStart, bpEnd) {

            var header, queryChr, qAlignments, alignmentContainer;

            header = self.header;

            queryChr = header.chrAliasTable.hasOwnProperty(chr) ? header.chrAliasTable[chr] : chr;

            qAlignments = self.alignmentCache.queryFeatures(queryChr, bpStart, bpEnd);

            alignmentContainer = new igv.AlignmentContainer(chr, bpStart, bpEnd, self.samplingWindowSize, self.samplingDepth, self.pairsSupported);

            qAlignments.forEach(function (a) {
                alignmentContainer.push(a);
            });

            alignmentContainer.finish();

            return alignmentContainer;
        }


    };

    function decodeDataURI(dataURI) {
        var bytes,
            split = dataURI.split(','),
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
    }


    return igv;

})
(igv || {});


