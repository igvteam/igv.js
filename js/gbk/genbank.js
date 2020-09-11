/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2018 The Regents of the University of California
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

import getDataWrapper from "../feature/dataWrapper.js";

const wsRegex = /(\s+)/;

const GenbankParser = function (config) {

    this.config = config;
    this.nameFields = new Set(["gene"]);

}


GenbankParser.prototype.parseFeatures = function (data) {

    var line, locusName, accession, sequence, aliases, chr;

    if (!data) return null;

    const dataWrapper = getDataWrapper(data);

    // Read locus
    line = dataWrapper.nextLine();
    readLocus(line);


    do {
        line = dataWrapper.nextLine();
        if (line.startsWith("ACCESSION")) {
            readAccession(line);
        } else if (line.startsWith("ALIASES")) {
            readAliases(line);
        }
    }
    while (line && !line.startsWith("FEATURES"));

    readFeatures(dataWrapper);
    readOriginSequence(dataWrapper);

    function readLocus(line) {
        const tokens = line.split(wsRegex);
        if (!tokens[0].equalsIgnoreCase("LOCUS")) {
            // throw exception
        }
        locusName = tokens[1].trim();
    }

    function readAccession(line) {

        let tokens = line.split(wsRegex);
        if (tokens.length < 2) {
            console.log("Genbank file missing ACCESSION number.");
        } else {
            accession = tokens[1].trim();
        }
    }

    /**
     * Read the sequence aliases line  -- Note: this is an IGV extension
     * ACCESSION   K03160
     *
     * @throws IOException
     */
    function readAliases(line) {
        let tokens = line.split(wsRegex);
        if (tokens.length < 2) {
            //log.info("Genbank file missing ACCESSION number.");
        } else {
            aliases = tokens[1].split(",");
        }
    }


    /**
     * Read the origin section.   Example...
     * <p/>
     * ORIGIN
     * 1 gatcctccat atacaacggt atctccacct caggtttaga tctcaacaac ggaaccattg
     * 61 ccgacatgag acagttaggt atcgtcgaga gttacaagct aaaacgagca gtagtcagct
     * 121 ctgcatctga agccgctgaa gttctactaa gggtggataa catcatccgt gcaagaccaa
     *
     * @param reader
     */
    function readOriginSequence(dataWrapper) {

        let line;

        sequence = [];
        while (((line = dataWrapper.nextLine()) !== undefined) && !line.startsWith("//")) {
            line = line.trim();
            let tokens = line.split(wsRegex);
            for (let i = 1; i < tokens.length; i++) {
                let str = tokens[i];
                for (let j = 0; j < str.length; j++) {
                    sequence.push(str.charCodeAt(j));
                }
            }
        }
    }


    /**
     * FEATURES             Location/Qualifiers
     * source          1..105338
     * /organism="Homo sapiens"
     * /mol_type="genomic DNA"
     * /db_xref="taxon:9606"
     * /chromosome="10"
     * gene            1..105338
     * /gene="PTEN"
     * /note="Derived by automated computational analysis using
     * gene prediction method: BestRefseq."
     * /db_xref="GeneID:5728"
     * /db_xref="HGNC:9588"
     * /db_xref="HPRD:03431"
     * /db_xref="MIM:601728"
     * <p/>
     * CDS             join(1033..1111,30588..30672,62076..62120,67609..67652,
     * 69576..69814,88681..88822,94416..94582,97457..97681,
     * 101850..102035)
     * /gene="PTEN"
     *
     * @param reader
     * @throws IOException
     */
    function readFeatures(dataWrapper) {


        chr = accession || locusName;

        //Process features until "ORIGIN"
        let features = [];

        let currentLocQualifier, nextLine,
            errorCount = 0;

        do {
            nextLine = dataWrapper.nextLine();

            // TODO -- first line is source (required), has total length => use to size sequence
            // TODO -- keys start at column 6,   locations and qualifiers at column 22.

            if(nextLine === "") {
                continue;  // Not sure this is legal in a gbk file
            }

            if (!nextLine || nextLine.startsWith("ORIGIN")) {
                break;
            }

            if (nextLine.length() < 6) {
                if (errorCount < 10) {
                    console("Unexpected line in genbank file (skipping): " + nextLine);
                }
                errorCount++;
                continue;
            }

            if (nextLine.charAt(5) !== ' ') {
                let featureType = nextLine.substring(5, 21).trim();
                let f = {
                    chr: chr,
                    type: featureType,
                    attributes: {}
                };

                currentLocQualifier = nextLine.substring(21);

                if (!featureType.toLowerCase().equals("source")) {
                    features.add(f);
                }

            } else {
                let tmp = nextLine.substring(21).trim();

                if (tmp.length() > 0)
                    if (tmp.charAt(0) === '/') {

                        if (currentLocQualifier.charAt(0) === '/') {

                            let tokens = currentLocQualifier.split("=", 2);

                            if (tokens.length > 1) {

                                let keyName = tokens[0].length() > 1 ? tokens[0].substring(1) : "";
                                let value = StringUtils.stripQuotes(tokens[1]);

                                f.attributes[keyName] = value;
                                if (nameFields.has(keyName)) {
                                    f.setName(value);
                                }
                            } else {
                                // TODO -- don't know how to interpret, log?
                            }
                        } else {

                            // location string TODO -- many forms of this to support
                            // Crude test for strand
                            let strand = currentLocQualifier.contains("complement") ? "-" : "+";
                            f.strand = strand;


                            // join and complement functions irrelevant
                            let joinString = currentLocQualifier.replace("join", "");
                            joinString = joinString.replace("order", "");
                            joinString = joinString.replace("complement", "");
                            joinString = joinString.replace("(", "");
                            joinString = joinString.replace(")", "");

                            if (joinString.contains("..")) {

                                joinString = joinString.replace("<", "");
                                joinString = joinString.replace(">", "");

                                let exons = createExons(joinString, strand);

                                let firstExon = exons[0];
                                f.start = firstExon.start;

                                let lastExon = exons.get[exons.length - 1];
                                f.setEnd = lastExon.end;

                                if (exons.length > 1) {
                                    f.exons = exons;
                                }
                            } else {
                                // TODO Single locus for now,  other forms possible
                                f.start = Number.parseInt(joinString) - 1;
                                f.end = start + 1;
                            }

                        }
                        currentLocQualifier = tmp;
                    } else {
                        currentLocQualifier = currentLocQualifier || tmp;
                    }
            }
        }
        while (true);
    }

}

/**
 * Create a list of Exon objects from the Embl join string.  Apparently exons in embl
 * format are represented by a single CDS record.
 *
 * @param joinString
 */
function createExons(joinString, strand) {

    let lociArray = joinString.split(",");

    let exons = [];

    let isNegative = joinString.contains("complement");

    lociArray.forEach(function (loci) {

        let tmp = loci.split("..");

        let exonStart = 0;    // - (isNegative ? 0 : 1);

        try {
            exonStart = Number.parseInt(tmp[0]) - 1;

            let exonEnd = exonStart + 1;
            if (tmp.length > 1) {
                exonEnd = Number.parseInt(tmp[1]);
            }

            exons.add({
                chr: accession,
                start: exonStart,
                end: exonEnd,
                strand: strand
            });

        } catch (e) {
            console.error(e);
        }
    });

    exons.sort(function (a, b) {
        return a.start - b.start;
    });

    return exons;
}

export default GenbankParser;
