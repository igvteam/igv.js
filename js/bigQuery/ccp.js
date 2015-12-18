/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 University of California San Diego
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


    igv.isb = {

        querySegByStudy: function (study, limit) {
            var q = "SELECT * FROM [isb-cgc:tcga_201510_alpha.Copy_Number_segments] " +
                "WHERE ParticipantBarcode IN " +
                "(SELECT ParticipantBarcode FROM [isb-cgc:tcga_201510_alpha.Clinical_data] WHERE Study = \"" + study + "\")";

            if(limit) q += (" limit " + limit);

            return q;
        },


        decodeSeg: function (row) {

            var seg = {};
            seg["ParticipantBarcode"] = row.f[0].v;
            seg["Study"] = row.f[4].v;
            seg["Chromosome"] = row.f[6].v;
            seg["Start"] = row.f[7].v;
            seg["End"] = row.f[8].v;
            seg["Num_Probes"] = row.f[9].v;
            seg["Segment_mean"] = row.f[10].v;
            return seg;
        }


    }

    return igv;

})(igv || {});