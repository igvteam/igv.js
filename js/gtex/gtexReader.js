/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 UC San Diego
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

import {igvxhr} from "../../node_modules/igv-utils/src/index.js";

const GtexReader = function (config) {

    this.config = config;
    this.url = config.url;
    this.tissueId = config.tissueSiteDetailId;
    this.indexed = true;
    this.datasetId = config.datasetId || "gtex_v8"
};

GtexReader.prototype.readFeatures = async function (chr, bpStart, bpEnd) {


    let self = this,
        queryChr = chr.startsWith("chr") ? chr : "chr" + chr,
        queryStart = Math.floor(bpStart),
        queryEnd = Math.ceil(bpEnd),
        datasetId = this.datasetId,
        queryURL = this.url + "?chromosome=" + queryChr + "&start=" + queryStart + "&end=" + queryEnd +
            "&tissueSiteDetailId=" + this.tissueId + "&datasetId=" + datasetId;

    const json = await igvxhr.loadJson(queryURL, {
        withCredentials: self.config.withCredentials
    })
    if (json && json.singleTissueEqtl) {
        //variants = json.variants;
        //variants.sort(function (a, b) {
        //    return a.POS - b.POS;
        //});
        //source.cache = new FeatureCache(chr, queryStart, queryEnd, variants);

        json.singleTissueEqtl.forEach(function (eqtl) {
            eqtl.chr = eqtl.chromosome;
            eqtl.position = eqtl.pos;
            eqtl.start = eqtl.pos - 1;
            eqtl.end = eqtl.start + 1;
            eqtl.snp = eqtl.snpId;
            eqtl.geneName = eqtl.geneSymbol;
            eqtl.geneId = eqtl.gencodeId;

        });

        return json.singleTissueEqtl;
    } else {
        return undefined;
    }
}

export default GtexReader;