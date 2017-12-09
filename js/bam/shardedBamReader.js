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

    igv.ShardedBamReader = function (config) {

        var genome, alias, bamReaders, chrAliasTable;

        this.config = config;

        bamReaders = {};
        chrAliasTable = {};
        genome = igv.browser ? igv.browser.genome : undefined;

        config.sources.sequences.forEach(function (chr) {

            bamReaders[chr] = null;   // Placeholder

            if (genome) {
                alias = genome.getChromosomeName(chr);
                chrAliasTable[alias] = chr;
            }
        });

        this.chrAliasTable = chrAliasTable;
        this.bamReaders = bamReaders;

        igv.BamUtils.setReaderDefaults(this, config);
    };

    igv.ShardedBamReader.prototype.readAlignments = function (chr, start, end) {

        var self = this,
            queryChr, reader, tmp, bamConfig;

        queryChr = self.chrAliasTable.hasOwnProperty(chr) ? self.chrAliasTable[chr] : chr;

        if (!this.bamReaders.hasOwnProperty(queryChr) || "none" === this.bamReaders[queryChr]) {
            return Promise.resolve(new igv.AlignmentContainer(chr, start, end));
        }

        else {

            reader = self.bamReaders[queryChr];

            if (!reader) {
                tmp = {
                    url: self.config.sources.url.replace("$CHR", queryChr)
                }
                if (self.config.sources.indexURL) {
                    tmp.indexURL = self.config.sources.indexURL.replace("$CHR", queryChr);
                }
                bamConfig = Object.assign(self.config, tmp);
                reader = new igv.BamReader(bamConfig);
                self.bamReaders[queryChr] = reader;
            }

            return reader.readAlignments(queryChr, start, end)
                .catch(function (error) {
                    console.error(error);
                    igv.presentAlert("Error reading BAM or index file for: " + tmp.url);
                    self.bamReaders[queryChr] = "none";
                    return new igv.AlignmentContainer(chr, start, end);   // Empty alignment container
                })
        }
    }


    return igv;
})
(igv || {});
