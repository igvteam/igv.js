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
 * Utilities for loading encode files
 *
 * Created by jrobinso on 3/19/14.
 */

var igv = (function (igv) {

    var antibodyColors = {H3K27AC: "rgb(200, 0, 0)",
        H3K27ME3: "rgb(130, 0, 4)",
        H3K36ME3: "rgb(0, 0, 150)",
        H3K4ME1: "rgb(0, 150, 0)",
        H3K4ME2: "rgb(0, 150, 0)",
        H3K4ME3: "rgb(0, 150, 0)",
        H3K9AC: "rgb(100, 0, 0)",
        H3K9ME1: "rgb(100, 0, 0)"};

    /**
     *       path    cell    dataType        antibody        view    replicate       type    lab     hub
     * @param file
     * @param continuation
     */

    parseEncodeTableFile = function (file, continuation) {

        var dataLoader = new igv.DataLoader(file);

        dataLoader.loadBinaryString(function (data) {

            var lines = data.splitLines(),
                dataSet = [ ],
                path;

            // Raw data items arrive in this order:
            //
            // path    cell    dataType        antibody        view    replicate       type    lab     hub
            //
            // Reorder to match desired DataTables order in encode.dataTableRowLabels. Discard hub item.
            //
            igv.dataTableRowLabels = lines[0].split("\t");
            igv.dataTableRowLabels.pop();
            path = igv.dataTableRowLabels.shift();
            igv.dataTableRowLabels.push(path);

            lines.slice(1, lines.length - 1).forEach(function (line) {

                var tokens,
                    row = [ ],
                    record = { };

                tokens = line.split("\t");
                tokens.pop();
                path = tokens.shift();
                tokens.push(path);

                tokens.forEach(function (token, index, tks) {

                    row.push( (undefined === token || "" === token) ? "-" : token );

                });

                dataSet.push(row);

            });

            continuation(dataSet);
        });

    };

    igv.createEncodeDataTablesDataSet = function (file, continuation) {

        parseEncodeTableFile(file, function (dataSet) {

            if (continuation) {
//                continuation(dataSet);
                continuation(dataSet);
            }


        });

    };

    igv.encodeTrackLabel = function (record) {

        return (record.antibody) ? record.antibody + " " + record.cell + " " + record.replicate : record.cell + record.dataType + " " + record.view + " " + record.replicate;

    };

    igv.encodeAntibodyColor = function (antibody) {

        var key;

        if (!antibody || "" === antibody) {
            return cursor.defaultColor();
        }

        key = antibody.toUpperCase();
        return (antibodyColors[ key ]) ? antibodyColors[ key ] : cursor.defaultColor();

    };

    return igv;

})(igv || {});
