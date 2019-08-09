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

import createVCFVariant from "./variant";
import getDataWrapper from "../feature/dataWrapper";

/**
 * Parser for VCF files.
 */
const VcfParser = function (type) {
    this.type = type;
}

VcfParser.prototype.parseHeader = function (data) {

    var dataWrapper,
        tokens,
        line,
        j,
        header = {},
        id,
        values,
        ltIdx,
        gtIdx,
        type;

    dataWrapper = getDataWrapper(data);

    // First line must be file format
    line = dataWrapper.nextLine();
    if (line.startsWith("##fileformat")) {
        header.version = line.substr(13);
    } else {
        throw new Error("Invalid VCF file: missing fileformat line");
    }

    while (line = dataWrapper.nextLine()) {

        if (line.startsWith("#")) {

            id = null;
            values = {};

            if (line.startsWith("##")) {

                if (line.startsWith("##INFO") || line.startsWith("##FILTER") || line.startsWith("##FORMAT")) {

                    ltIdx = line.indexOf("<");
                    gtIdx = line.lastIndexOf(">");

                    if (!(ltIdx > 2 && gtIdx > 0)) {
                        console.log("Malformed VCF header line: " + line);
                        continue;
                    }

                    type = line.substring(2, ltIdx - 1);
                    if (!header[type]) header[type] = {};

                    //##INFO=<ID=AF,Number=A,Type=Float,Description="Allele frequency based on Flow Evaluator observation counts">
                    // ##FILTER=<ID=NOCALL,Description="Generic filter. Filtering details stored in FR info tag.">
                    // ##FORMAT=<ID=AF,Number=A,Type=Float,Description="Allele frequency based on Flow Evaluator observation counts">

                    tokens = igv.splitStringRespectingQuotes(line.substring(ltIdx + 1, gtIdx - 1), ",");

                    tokens.forEach(function (token) {
                        var kv = token.split("=");
                        if (kv.length > 1) {
                            if (kv[0] === "ID") {
                                id = kv[1];
                            } else {
                                values[kv[0]] = kv[1];
                            }
                        }
                    });

                    if (id) {
                        header[type][id] = values;
                    }
                } else {
                    // Ignoring other ## header lines
                }
            } else if (line.startsWith("#CHROM")) {
                tokens = line.split("\t");

                if (tokens.length > 8) {

                    // call set names -- use column index for id
                    header.callSets = [];
                    for (j = 9; j < tokens.length; j++) {
                        header.callSets.push({id: j, name: tokens[j]});
                    }
                }
            }

        } else {
            break;
        }

    }

    this.header = header;  // Will need to intrepret genotypes and info field

    return header;
}

function extractCallFields(tokens) {

    var callFields = {
            genotypeIndex: -1,
            fields: tokens
        },
        i;

    for (i = 0; i < tokens.length; i++) {
        if ("GT" === tokens[i]) {
            callFields.genotypeIndex = i;
        }
    }

    return callFields;

}

/**
 * Parse data as a collection of Variant objects.
 *
 * @param data
 * @returns {Array}
 */
VcfParser.prototype.parseFeatures = function (data) {

    var dataWrapper,
        line,
        allFeatures = [],
        callSets = this.header.callSets,
        variant,
        tokens,
        callFields,
        index,
        token;


    dataWrapper = getDataWrapper(data);

    while (line = dataWrapper.nextLine()) {

        if (!line.startsWith("#")) {

            tokens = line.split("\t");

            if (tokens.length >= 8) {

                variant = createVCFVariant(tokens);

                if (variant.isRefBlock()) continue;     // Skip reference blocks

                variant.header = this.header;       // Keep a pointer to the header to interpret fields for popup text
                allFeatures.push(variant);

                if (tokens.length > 9) {

                    // Format
                    callFields = extractCallFields(tokens[8].split(":"));

                    variant.calls = {};

                    for (index = 9; index < tokens.length; index++) {

                        token = tokens[index];

                        var callSet = callSets[index - 9],
                            call = {
                                callSetName: callSet.name,
                                info: {}
                            };

                        variant.calls[callSet.id] = call;

                        token.split(":").forEach(function (callToken, idx) {

                            switch (idx) {
                                case callFields.genotypeIndex:
                                    call.genotype = [];
                                    callToken.split(/[\|\/]/).forEach(function (s) {
                                        call.genotype.push(parseInt(s));
                                    });
                                    break;

                                default:
                                    call.info[callFields.fields[idx]] = callToken;
                            }
                        });
                    }

                }

            }
        }
    }

    return allFeatures;
}

export default VcfParser;
