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

import BinaryParser from "../binary.js";
import igvxhr from "../igvxhr.js";
import {buildOptions} from "../util/igvUtils.js";

const SEQUENCE_DICTIONARY_FLAG = 0x8000;  // if we have a sequence dictionary in our header
/**
 *
 * @param indexFile
 * @param config
 * @returns a Promise for the tribble-style (.idx) index.  The fulfill function takes the index as an argument
 */
function loadTribbleIndex(indexFile, config, genome) {

    return new Promise(function (fullfill) {

        igvxhr
            .loadArrayBuffer(indexFile, buildOptions(config))
            .then(function (arrayBuffer) {

                if (arrayBuffer) {

                    var index = {};

                    var parser = new BinaryParser(new DataView(arrayBuffer));

                    readHeader(parser);

                    var nChrs = parser.getInt();
                    while (nChrs-- > 0) {
                        // todo -- support interval tree index, we're assuming its a linear index
                        var chrIdx = readLinear(parser);
                        index[chrIdx.chr] = chrIdx;
                    }

                    fullfill(new TribbleIndex(index));
                } else {
                    fullfill(null);
                }

            })
            .catch(function (error) {
                console.log(error);
                fullfill(null);
            });

        function readHeader(parser) {

            //var magicString = view.getString(4);
            var magicNumber = parser.getInt();     //   view._getInt32(offset += 32, true);
            var type = parser.getInt();
            var version = parser.getInt();

            var indexedFile = parser.getString();

            var indexedFileSize = parser.getLong();

            var indexedFileTS = parser.getLong();
            var indexedFileMD5 = parser.getString();
            var flags = parser.getInt();
            if (version < 3 && (flags & SEQUENCE_DICTIONARY_FLAG) === SEQUENCE_DICTIONARY_FLAG) {
                // readSequenceDictionary(dis);
            }

            if (version >= 3) {
                var nProperties = parser.getInt();
                while (nProperties-- > 0) {
                    var key = parser.getString();
                    var value = parser.getString();
                }
            }
        }

        function readLinear(parser) {

            var chr = parser.getString(),
                blockMax = 0;

            // Translate to canonical name
            if (genome) chr = genome.getChromosomeName(chr);

            var binWidth = parser.getInt();
            var nBins = parser.getInt();
            var longestFeature = parser.getInt();
            //largestBlockSize = parser.getInt();
            // largestBlockSize and totalBlockSize are old V3 index values.  largest block size should be 0 for
            // all newer V3 block.  This is a nasty hack that should be removed when we go to V4 (XML!) indices
            var OLD_V3_INDEX = parser.getInt() > 0;
            var nFeatures = parser.getInt();

            // note the code below accounts for > 60% of the total time to read an index
            var pos = parser.getLong();
            var chrBegPos = pos;

            var blocks = new Array();
            for (var binNumber = 0; binNumber < nBins; binNumber++) {
                var nextPos = parser.getLong();
                var size = nextPos - pos;
                blocks.push({min: pos, max: nextPos}); //        {position: pos, size: size});
                pos = nextPos;

                if (nextPos > blockMax) blockMax = nextPos;
            }

            return {chr: chr, blocks: blocks, longestFeature: longestFeature, binWidth: binWidth};

        }

    });
};

const TribbleIndex = function (chrIndexTable) {
    this.chrIndex = chrIndexTable;      // Dictionary of chr -> tribble index
};

/**
 * Fetch blocks for a particular genomic range.
 *
 * TODO -- currently this returns all blocks for the chromosome, min and max are ignored.  Fix this.
 *
 * @param queryChr the sequence dictionary index of the chromosome
 * @param min  genomic start position
 * @param max  genomic end position
 */
TribbleIndex.prototype.blocksForRange = function (queryChr, min, max) { //function (refId, min, max) {

    var self = this;
    var chrIdx = this.chrIndex[queryChr];

    if (chrIdx) {
        var blocks = chrIdx.blocks;
        var longestFeature = chrIdx.longestFeature;
        var binWidth = chrIdx.binWidth;
        var adjustedPosition = Math.max(min - longestFeature, 0);
        var startBinNumber = Math.floor(adjustedPosition / binWidth);

        if (startBinNumber >= blocks.length) // are we off the end of the bin list, so return nothing
            return [];
        else {

            var endBinNumber = Math.min(Math.floor((max - 1) / binWidth), blocks.length - 1);

            // By definition blocks are adjacent for the liner index.  Combine them into one merged block

            var startPos = blocks[startBinNumber].min;
            var endPos = blocks[endBinNumber].max;
            var size = endPos - startPos;
            if (size === 0) {
                return [];
            } else {
                var mergedBlock = {minv: {block: startPos, offset: 0}, maxv: {block: endPos, offset: 0}};
                return [mergedBlock];
            }


            //  var blocks = chrIdx.blocks,
            //      lastBlock = blocks[blocks.length - 1],
            //     mergedBlock = {minv: {block: blocks[0].min, offset: 0}, maxv: {block: lastBlock.max, offset: 0}};
            // return [mergedBlock];
        }
    } else {
        return null;
    }
};

export default loadTribbleIndex;
