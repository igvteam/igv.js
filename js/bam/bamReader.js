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


    const MAX_GZIP_BLOCK_SIZE = 65536; // See BGZF compression format in SAM format specification

    /**
     * Class for reading a bam file
     *
     * @param config
     * @constructor
     */
    igv.BamReader = function (config, genome) {

        this.config = config;

        this.genome = genome;

        this.bamPath = config.url;

        // Todo - deal with Picard convention.  WHY DOES THERE HAVE TO BE 2?
        this.baiPath = config.indexURL || igv.inferIndexPath(this.bamPath, "bai"); // If there is an indexURL provided, use it!

        igv.BamUtils.setReaderDefaults(this, config);

    };

    igv.BamReader.prototype.readAlignments = async function (chr, bpStart, bpEnd) {

        const chrToIndex = await getChrIndex.call(this)
        const queryChr = this.chrAliasTable.hasOwnProperty(chr) ? this.chrAliasTable[chr] : chr;
        const chrId = chrToIndex[queryChr];

        const alignmentContainer = new igv.AlignmentContainer(chr, bpStart, bpEnd, this.samplingWindowSize, this.samplingDepth, this.pairsSupported);

        if (chrId === undefined) {
            return alignmentContainer;

        } else {

            const bamIndex = await getIndex.call(this)
            const chunks = bamIndex.blocksForRange(chrId, bpStart, bpEnd)

            if (!chunks || chunks.length === 0) {
                return alignmentContainer;
            }

            const promises = [];
            for (let c of chunks) {

                let lastBlockSize
                try {
                    const bsizeOptions = igv.buildOptions(this.config, {range: {start: c.maxv.block, size: 26}});
                    const abuffer = await igv.xhr.loadArrayBuffer(this.bamPath, bsizeOptions)
                    lastBlockSize = igv.bgzBlockSize(abuffer)
                } catch (e) {
                    lastBlockSize = 0
                }

                const fetchMin = c.minv.block
                const fetchMax = c.maxv.block + lastBlockSize
                const range = {start: fetchMin, size: fetchMax - fetchMin + 1};
                promises.push(igv.xhr.loadArrayBuffer(this.bamPath, igv.buildOptions(this.config, {range: range})))
            }

            const compressedChunks = await Promise.all(promises)

            for (let i = 0; i < chunks.length; i++) {
                try {
                    const compressed = compressedChunks[i]
                    const c = chunks[i]
                    var ba = new Uint8Array(igv.unbgzf(compressed)); //new Uint8Array(igv.unbgzf(compressed)); //, c.maxv.block - c.minv.block + 1));
                    igv.BamUtils.decodeBamRecords(ba, c.minv.offset, alignmentContainer, this.indexToChr, chrId, bpStart, bpEnd, this.filter);
                } catch (e) {
                    console.error("Error decompressing chunk " + i)
                }

            }

            alignmentContainer.finish();
            return alignmentContainer;

        }
    }


    async function getHeader() {
        if(!this.header) {
            const genome = this.genome;
            const index = await getIndex.call(this)
            const bsizeOptions = igv.buildOptions(this.config, {range: {start: index.firstAlignmentBlock, size: 26}});
            const abuffer = await igv.xhr.loadArrayBuffer(this.bamPath, bsizeOptions)
            const bsize = igv.bgzBlockSize(abuffer)

            const len = index.firstAlignmentBlock + bsize;   // Insure we get the complete compressed block containing the header
            const options = igv.buildOptions(this.config, {range: {start: 0, size: len}});
            this.header = await igv.BamUtils.readHeader(this.bamPath, options, genome);
        }
        return this.header
    }

    async function getIndex() {
        const genome = this.genome;
        if (!this.index) {
            this.index = await igv.loadBamIndex(this.baiPath, this.config, false, genome)
            return this.index
        }
        return this.index;
    }

    async function getChrIndex() {

        if (this.chrToIndex) {
            return this.chrToIndex;
        }
        else {
            const header = await getHeader.call(this)
            this.chrToIndex = header.chrToIndex;
            this.indexToChr = header.chrNames;
            this.chrAliasTable = header.chrAliasTable;
            return this.chrToIndex;

        }
    }

    return igv;

})
(igv || {});


