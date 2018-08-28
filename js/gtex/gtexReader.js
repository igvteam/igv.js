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

/**
 * Created by jrobinso on 10/8/15.
 */

var igv = (function (igv) {


    /**
     * @param url - url to the webservice
     * @constructor
     */
    igv.GtexReader = function (config) {

        this.config = config;
        this.url = config.url;
        this.tissueName = config.tissueName;
        this.indexed = true;
        this.datasetId = config.datasetId || "gtex_v7"
    };

    //{
    //    "release": "v6",
    //    "singleTissueEqtl": [
    //    {
    //        "beta": -0.171944779728988,
    //        "chromosome": "3",
    //        "gencodeId": "ENSG00000168827.10",
    //        "geneSymbol": "GFM1",
    //        "pValue": 1.22963421134407e-09,
    //        "snpId": "rs3765025",
    //        "start": 158310846,
    //        "tissueName": "Thyroid"
    //    },
    // "singleTissueEqtl": [
    //     {
    //         "beta": 0.388922,
    //         "chromosome": "12",
    //         "gencodeId": "ENSG00000245017.2",
    //         "geneSymbol": "RP11-181C3.1",
    //         "geneSymbolUpper": "RP11-181C3.1",
    //         "pValue": 5.76253e-06,
    //         "release": "v7",
    //         "snpId": "rs10860345",
    //         "start": 98972466,
    //         "tissueName": "Adrenal_Gland",
    //         "variantId": "12_98972466_T_C_b37"
    //     }
    //
    // http://vgtxportaltest.broadinstitute.org:9000/v6/singleTissueEqtlByLocation?tissueName=Thyroid&chromosome=3&start=158310650&end=158311650

        igv.GtexReader.prototype.readFeatures = function (chr, bpStart, bpEnd) {

            let self=this,
                queryChr = chr.startsWith("chr") ? chr.substr(3) : chr,
                queryStart = Math.floor(bpStart),
                queryEnd = Math.ceil(bpEnd),
                datasetId = this.datasetId,
                queryURL = this.url + "?chromosome=" + queryChr + "&start=" + queryStart + "&end=" + queryEnd +
                    "&tissueName=" + this.tissueName + "&datasetId=" + datasetId;

            return new Promise(function (fulfill, reject) {

                igv.xhr.loadJson(queryURL, {
                    withCredentials: self.config.withCredentials
                }).then(function (json) {

                    var variants;

                    if (json && json.singleTissueEqtl) {
                        //variants = json.variants;
                        //variants.sort(function (a, b) {
                        //    return a.POS - b.POS;
                        //});
                        //source.cache = new FeatureCache(chr, queryStart, queryEnd, variants);

                        json.singleTissueEqtl.forEach(function (eqtl) {
                            eqtl.chr = "chr" + eqtl.chromosome;
                            eqtl.position = eqtl.pos;
                            eqtl.start = eqtl.pos - 1;
                            eqtl.end = eqtl.start + 1;
                            eqtl.snp = eqtl.snpId;
                            eqtl.geneName = eqtl.geneSymbol;
                            eqtl.geneId = eqtl.gencodeId;

                        });

                        fulfill(json.singleTissueEqtl);
                    }
                    else {
                        fulfill(null);
                    }

                }).catch(reject);

            });
        }


    return igv;
})
(igv || {});
