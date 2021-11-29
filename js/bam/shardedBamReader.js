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

import BamReader from "./bamReader.js"
import AlignmentContainer from "./alignmentContainer.js"
import BamUtils from "./bamUtils.js"

class ShardedBamReader {

    constructor(config, genome) {

        this.config = config
        this.genome = genome

        const bamReaders = {}
        const chrAliasTable = {}

        config.sources.sequences.forEach(function (chr) {
            const queryChr = genome ? genome.getChromosomeName(chr) : chr
            bamReaders[queryChr] = getReader(config, genome, chr)
        })

        this.bamReaders = bamReaders

        BamUtils.setReaderDefaults(this, config)
    }

    async readAlignments(chr, start, end) {

        if (!this.bamReaders.hasOwnProperty(chr)) {
            return new AlignmentContainer(chr, start, end)
        } else {

            let reader = this.bamReaders[chr]
            const a = await reader.readAlignments(chr, start, end)
            return a
        }
    }
}

function getReader(config, genome, chr) {
    const tmp = {
        url: config.sources.url.replace("$CHR", chr)
    }
    if (config.sources.indexURL) {
        tmp.indexURL = config.sources.indexURL.replace("$CHR", chr)
    }
    const bamConfig = Object.assign(config, tmp)

    // TODO -- support non-indexed, htsget, etc
    return new BamReader(bamConfig, genome)
}

export default ShardedBamReader
