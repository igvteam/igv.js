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
 *  Define parsers for bed-like files  (.bed, .gff, .vcf, etc).  A parser should implement 2 methods
 *
 *     parseHeader(data) - return an object representing a header or metadata.  Details are format specific
 *
 *     parseFeatures(data) - return an array of features
 *
 */


var igv = (function (igv) {

    var maxFeatureCount = Number.MAX_VALUE;    // For future use,  controls downsampling

    var gffNameFields = ["Name", "gene_name", "gene", "gene_id", "alias", "locus"];

    var aedRegexpNoNamespace = new RegExp("([^:]*)\\(([^)]*)\\)"); // name(type) for AED parsing (namespace undefined)
    var aedRegexpNamespace = new RegExp("([^:]*):([^(]*)\\(([^)]*)\\)"); // namespace:name(type) for AED parsing

    /**
     * Return a parser for the given file format.
     */
    igv.FeatureParser = function (format, decode, config) {

        var customFormat;

        if (format !== undefined) {
            this.format = format.toLowerCase();
        }
        this.nameField = config ? config.nameField : undefined;
        this.skipRows = 0;   // The number of fixed header rows to skip.  Override for specific types as needed

        if (decode) {
            this.decode = decode;
        }
        else {

            switch (this.format) {
                case "narrowpeak":
                case "broadpeak":
                case "peaks":
                    this.decode = decodePeak;
                    this.delimiter = /\s+/;
                    break;
                case "bedgraph":
                    this.decode = decodeBedGraph;
                    this.delimiter = /\s+/;
                    break;
                case "wig":
                    this.decode = decodeWig;
                    this.delimiter = /\s+/;
                    break;
                case "gff3" :
                case "gff" :
                case "gtf" :
                    this.decode = decodeGFF;
                    this.delimiter = "\t";
                    break;
                case "fusionjuncspan":
                    // bhaas, needed for FusionInspector view
                    this.decode = decodeFusionJuncSpan;
                    this.delimiter = /\s+/;
                    break;
                case "gtexgwas":
                    this.skipRows = 1;
                    this.decode = decodeGtexGWAS;
                    this.delimiter = "\t";
                    break;
                case "refflat":
                    this.decode = decodeReflat;
                    this.delimiter = /\s+/;
                    break;
                case "genepred":
                    this.decode = decodeGenePred;
                    this.delimiter = /\s+/;
                    break;
                case "genepredext":
                    this.decode = decodeGenePredExt;
                    this.delimiter = /\s+/;
                    break;
                case "ensgene":
                    this.decode = decodeGenePred
                    this.shift = 1;
                    this.delimiter = /\s+/;
                    break;
                case "refgene":
                    this.decode = decodeGenePredExt;
                    this.delimiter = /\s+/;
                    this.shift = 1;
                    break;
                case "aed":
                    this.decode = decodeAed;
                    this.delimiter = "\t";
                    break;
                case "bed":
                    this.decode = decodeBed;
                    this.delimiter = config.delimiter || /\s+/;
                    break;
                case "bedpe":
                    this.skipRows = 1;
                    this.decode = decodeBedpe;
                    this.delimiter = /\s+/;
                    break;
                case "bedpe-domain":
                    this.decode = decodeBedpeDomain;
                    this.headerLine = true;
                    this.delimiter = /\s+/;
                    break;
                case "bedpe-loop":
                    this.decode = decodeBedpe;
                    this.delimiter = /\s+/;
                    this.skipRows = 1;
                    this.header = {colorColumn: 7};
                    break;
                case "snp":
                    this.decode = decodeSNP;
                    this.delimiter = "\t";
                    break;
                case "rmsk":
                    this.decode = decodeRepeatMasker;
                    this.delimiter = "\t";
                    break;
                default:

                    customFormat = igv.getFormat(this.format);
                    if (customFormat !== undefined) {
                        this.decode = decodeCustom;
                        this.format = customFormat;
                        this.delimiter = customFormat.delimiter || "\t";
                    }

                    else {
                        this.decode = decodeBed;
                        this.delimiter = /\s+/;
                    }
            }
        }

    };

    igv.FeatureParser.prototype.parseHeader = function (data) {

        var line,
            header,
            dataWrapper;

        dataWrapper = igv.getDataWrapper(data);

        while (line = dataWrapper.nextLine()) {
            if (line.startsWith("track") || line.startsWith("#") || line.startsWith("browser")) {
                if (line.startsWith("track")) {
                    let h = parseTrackLine(line);
                    if (header) {
                        Object.assign(header, h);
                    } else {
                        header = h;
                    }

                } else if (line.startsWith("#columns")) {
                    let h = parseColumnsDirective(line);
                    if (header) {
                        Object.assign(header, h);
                    } else {
                        header = h;
                    }
                }
                else if (line.startsWith("##gff-version 3")) {
                    this.format = "gff3";
                    if (!header) header = {};
                    header["format"] = "gff3";
                }
            }
            else {
                break;
            }
        }

        this.header = header;    // Directives might be needed for parsing lines

        return header;
    };

    igv.FeatureParser.prototype.parseFeatures = function (data) {

        if (!data) return null;

        var dataWrapper,
            wig,
            feature,
            tokens,
            allFeatures = [],
            line,
            i,
            cnt = 0,
            j,
            decode = this.decode,
            format = this.format,
            delimiter = this.delimiter || "\t",
            nextLine;

        // Double quoted strings can contain newlines in AED
        // "" is an escape for a ".
        // Parse all this, clean it up, split into tokens in a custom way
        function readTokensAed() {
            var tokens = [],
                token = "",
                quotedString = false,
                n,
                c;

            while (line || line === '') {
                for (n = 0; n < line.length; n++) {
                    c = line.charAt(n);
                    if (c === delimiter) {
                        if (!quotedString) {
                            tokens.push(token);
                            token = "";
                        }
                        else {
                            token += c;
                        }
                    }
                    else if (c === "\"") {
                        // Look ahead to the next character
                        if (n + 1 < line.length && line.charAt(n + 1) === "\"") {
                            if (quotedString) {
                                // Turn "" into a single " in the output string
                                token += "\"";
                            }
                            else {
                                // "" on its own means empty string, ignore
                            }
                            // Skip the next double quote
                            n++;
                        }
                        else {
                            // We know the next character is NOT a double quote, flip our state
                            quotedString = !quotedString;
                        }
                    }
                    else {
                        token += c;
                    }
                }
                // We are at the end of the line
                if (quotedString) {
                    token += '\n'; // Add newline to the token
                    line = nextLine(); // Keep going
                }
                else {
                    // We can end the loop
                    break;
                }
            }
            // Push the last token
            tokens.push(token);
            return tokens;
        }

        dataWrapper = igv.getDataWrapper(data);
        if (format === 'aed') {
            nextLine = dataWrapper.nextLineNoTrim.bind(dataWrapper);
        }
        else {
            nextLine = dataWrapper.nextLine.bind(dataWrapper);
        }

        i = 0;

        while (line = nextLine()) {

            i++;

            if (i <= this.skipRows) continue;

            if (line.startsWith("track") || line.startsWith("#") || line.startsWith("browser")) {
                continue;
            }
            else if (format === "wig" && line.startsWith("fixedStep")) {
                wig = parseFixedStep(line);
                continue;
            }
            else if (format === "wig" && line.startsWith("variableStep")) {
                wig = parseVariableStep(line);
                continue;
            }

            if (format !== "aed" || line.indexOf("\"") === -1) {
                tokens = line.split(delimiter);
            }
            else {
                tokens = readTokensAed();
            }

            if (tokens.length < 1) {
                continue;
            }

            if (format === "aed") {
                if (!this.aed) {
                    // Store information about the aed header in the parser itself
                    // This is done only once - on the first row
                    this.aed = parseAedHeaderRow(tokens);
                    continue;
                }
            }

            feature = decode.call(this, tokens, wig);

            if (feature) {
                if (allFeatures.length < maxFeatureCount) {
                    allFeatures.push(feature);
                }
                else {
                    // Reservoir sampling,  conditionally replace existing feature with new one.
                    j = Math.floor(Math.random() * cnt);
                    if (j < maxFeatureCount) {
                        allFeatures[j] = feature;
                    }
                }
                cnt++;
            }
        }

        return allFeatures;
    };


    function parseFixedStep(line) {

        var tokens = line.split(/\s+/),
            cc = tokens[1].split("=")[1],
            ss = parseInt(tokens[2].split("=")[1], 10),
            step = parseInt(tokens[3].split("=")[1], 10),
            span = (tokens.length > 4) ? parseInt(tokens[4].split("=")[1], 10) : 1;

        return {format: "fixedStep", chrom: cc, start: ss, step: step, span: span, index: 0};

    }

    function parseVariableStep(line) {

        var tokens = line.split(/\s+/),
            cc = tokens[1].split("=")[1],
            span = tokens.length > 2 ? parseInt(tokens[2].split("=")[1], 10) : 1;
        return {format: "variableStep", chrom: cc, span: span}
    }

    function parseAedToken(value) {
        // Example: refseq:accessionNumber(aed:String)
        // refseq - namespace, will be declared later
        // accessionNumber - name of the field
        // aed:String - type of the field
        // The namespace part may be missing
        var match = aedRegexpNamespace.exec(value);
        if (match) {
            return {
                namespace: match[1],
                name: match[2],
                type: match[3]
            }
        }

        match = aedRegexpNoNamespace.exec(value);
        if (match) {
            return {
                namespace: '?',
                name: match[1],
                type: match[2]
            }
        }
        else {
            throw new Error("Error parsing the header row of AED file - column not in ns:name(ns:type) format");
        }
    }

    function parseAedHeaderRow(tokens) {
        // First row of AED file defines column names
        // Each header item is an aed token - see parseAedToken
        var aed,
            k,
            token,
            aedToken;

        // Initialize aed section to be filled in
        aed = {
            columns: [ // Information about the namespace, name and type of each column
                // Example entry:
                // { namespace: 'bio', name: 'start', type: 'aed:Integer' }
            ],
            metadata: { // Metadata about the entire AED file
                // Example:
                // {
                //    aed: {
                //       application: { value: "CHaS Browser 3.3.0.139 (r10838)", type: "aed:String" },
                //       created: { value: "2018-01-02T10:20:30.123+01:00", type: "aed:DateTime" },
                //       modified: { value: "2018-03-04T11:22:33.456+01:00", type: "aed:DateTime" },
                //    }
                //    affx: {
                //       ucscGenomeVersion: { value: "hg19", type: "aed:String" }
                //    },
                //    namespace: {
                //       omim: { value: "http://affymetrix.com/ontology/www.ncbi.nlm.nih.gov/omim/", type: "aed:URI" },
                //       affx: { value: "http://affymetrix.com/ontology/", type: "aed:URI" },
                //       refseq: { value: "http://affymetrix.com/ontology/www.ncbi.nlm.nih.gov/RefSeq/", type: "aed:URI" }
                //    }
                // }
            }
        };
        for (k = 0; k < tokens.length; k++) {
            token = tokens[k];
            aedToken = parseAedToken(token);
            aed.columns.push(aedToken);
        }

        return aed;
    }

    function parseTrackLine(line) {
        var properties = {},
            tokens = line.split(/(?:")([^"]+)(?:")|([^\s"]+)(?=\s+|$)/g),
            tmp = [],
            i, tk, curr;

        // Clean up tokens array
        for (i = 1; i < tokens.length; i++) {
            if (!tokens[i] || tokens[i].trim().length === 0) continue;

            tk = tokens[i].trim();

            if (tk.endsWith("=") > 0) {
                curr = tk;
            }
            else if (curr) {
                tmp.push(curr + tk);
                curr = undefined;
            }
            else {
                tmp.push(tk);
            }

        }


        tmp.forEach(function (str) {
            if (!str) return;
            var kv = str.split('=', 2);
            if (kv.length == 2) {
                properties[kv[0]] = kv[1];
            }

        });

        return properties;
    }

    function parseColumnsDirective(line) {

        let properties = {};
        let t1 = line.split(/\s+/);

        if (t1.length === 2) {

            let t2 = t1[1].split(";");

            t2.forEach(function (keyValue) {

                let t = keyValue.split("=");

                if (t[0] === "color") {
                    properties.colorColumn = Number.parseInt(t[1]) - 1;
                } else if (t[0] === "thickness") {
                    properties.thicknessColumn = Number.parseInt(t[1]) - 1;
                }
            })
        }

        return properties;
    }

    /**
     * Decode the "standard" UCSC bed format
     * @param tokens
     * @param ignore
     * @returns decoded feature, or null if this is not a valid record
     */
    function decodeBed(tokens, ignore) {

        var chr, start, end, id, name, tmp, idName, exonCount, exonSizes, exonStarts, exons, exon, feature,
            eStart, eEnd;

        if (tokens.length < 3) return undefined;

        chr = tokens[0];
        start = parseInt(tokens[1]);
        end = tokens.length > 2 ? parseInt(tokens[2]) : start + 1;

        feature = {chr: chr, start: start, end: end, score: 1000};

        if (tokens.length > 3) {
            // Note: these are very special rules for the gencode gene files.
            // tmp = tokens[3].replace(/"/g, '');
            // idName = tmp.split(';');
            // for (var i = 0; i < idName.length; i++) {
            //     var kv = idName[i].split('=');
            //     if (kv[0] == "gene_id") {
            //         id = kv[1];
            //     }
            //     if (kv[0] == "gene_name") {
            //         name = kv[1];
            //     }
            // }
            // feature.id = id ? id : tmp;
            // feature.name = name ? name : tmp;
            feature.name = tokens[3];
        }

        if (tokens.length > 4) {
            feature.score = parseFloat(tokens[4]);
        }
        if (tokens.length > 5) {
            feature.strand = tokens[5];
        }
        if (tokens.length > 6) {
            feature.cdStart = parseInt(tokens[6]);
        }
        if (tokens.length > 7) {
            feature.cdEnd = parseInt(tokens[7]);
        }
        if (tokens.length > 8) {
            if (tokens[8] !== "." && tokens[8] !== "0")
                feature.color = igv.Color.createColorString(tokens[8]);
        }
        if (tokens.length > 11) {
            exonCount = parseInt(tokens[9]);
            exonSizes = tokens[10].split(',');
            exonStarts = tokens[11].split(',');
            exons = [];

            for (var i = 0; i < exonCount; i++) {
                eStart = start + parseInt(exonStarts[i]);
                eEnd = eStart + parseInt(exonSizes[i]);
                var exon = {start: eStart, end: eEnd};

                if (feature.cdStart > eEnd || feature.cdEnd < eStart) exon.utr = true;   // Entire exon is UTR
                if (feature.cdStart >= eStart && feature.cdStart <= eEnd) exon.cdStart = feature.cdStart;
                if (feature.cdEnd >= eStart && feature.cdEnd <= eEnd) exon.cdEnd = feature.cdEnd;

                exons.push(exon);
            }

            feature.exons = exons;
        }

        // Optional extra columns
        if (this.header) {
            let thicknessColumn = this.header.thicknessColumn;
            let colorColumn = this.header.colorColumn;
            if (colorColumn && colorColumn < tokens.length) {
                feature.color = igv.Color.createColorString(tokens[colorColumn])
            }
            if (thicknessColumn && thicknessColumn < tokens.length) {
                feature.thickness = tokens[thicknessColumn];
            }
        }

        return feature;

    }

    /**
     * Decode a UCSC repeat masker record.
     *
     * Columns, from UCSC documentation
     *
     * 0  bin    585    smallint(5) unsigned    Indexing field to speed chromosome range queries.
     * 1  swScore    1504    int(10) unsigned    Smith Waterman alignment score
     * 2  milliDiv    13    int(10) unsigned    Base mismatches in parts per thousand
     * 3  milliDel    4    int(10) unsigned    Bases deleted in parts per thousand
     * 4  milliIns    13    int(10) unsigned    Bases inserted in parts per thousand
     * 5  genoName    chr1    varchar(255)    Genomic sequence name
     * 6  genoStart    10000    int(10) unsigned    Start in genomic sequence
     * 7  genoEnd    10468    int(10) unsigned    End in genomic sequence
     * 8  genoLeft    -249240153    int(11)    -#bases after match in genomic sequence
     * 9  strand    +    char(1)    Relative orientation + or -
     * 10 repName    (CCCTAA)n    varchar(255)    Name of repeat
     * 11 repClass    Simple_repeat    varchar(255)    Class of repeat
     * 12 repFamily    Simple_repeat    varchar(255)    Family of repeat
     * 13 repStart    1    int(11)    Start (if strand is +) or -#bases after match (if strand is -) in repeat sequence
     * 14 repEnd    463    int(11)    End in repeat sequence
     * 15 repLeft    0    int(11)    -#bases after match (if strand is +) or start (if strand is -) in repeat sequence
     * 16 id    1    char(1)    First digit of id field in RepeatMasker .out file. Best ignored.
     */
    function decodeRepeatMasker(tokens, ignore) {

        if (tokens.length < 15) return undefined;

        const feature = {
            swScore: Number.parseInt(tokens[1]),
            milliDiv: Number.parseInt(tokens[2]),
            milliDel: Number.parseInt(tokens[3]),
            milliIns: Number.parseInt(tokens[4]),
            chr: tokens[5],
            start: Number.parseInt(tokens[6]),
            end: Number.parseInt(tokens[7]),
            //genoLeft: tokens[8],
            strand: tokens[9],
            repName: tokens[10],
            repClass: tokens[11],
            repFamily: tokens[12],
            repStart: Number.parseInt(tokens[13]),
            repEnd: Number.parseInt(tokens[14]),
            repLeft: Number.parseInt(tokens[15])
        };

        return feature;

    }

    /**
     * Decode a UCSC "genePred" record.
     *
     * @param tokens
     * @param ignore
     * @returns {*}
     */
    function decodeGenePred(tokens, ignore) {

        var shift = this.shift === undefined ? 0 : 1;

        if (tokens.length < 9 + shift) return undefined;

        var feature = {
                name: tokens[0 + shift],
                chr: tokens[1 + shift],
                strand: tokens[2 + shift],
                start: parseInt(tokens[3 + shift]),
                end: parseInt(tokens[4 + shift]),
                cdStart: parseInt(tokens[5 + shift]),
                cdEnd: parseInt(tokens[6 + shift]),
                id: tokens[0 + shift]
            },
            exonCount = parseInt(tokens[7 + shift]),
            exonStarts = tokens[8 + shift].split(','),
            exonEnds = tokens[9 + shift].split(','),
            exons = [];

        for (var i = 0; i < exonCount; i++) {
            exons.push({start: parseInt(exonStarts[i]), end: parseInt(exonEnds[i])});
        }

        feature.exons = exons;

        return feature;

    }

    /**
     * Decode a UCSC "genePredExt" record.  refGene files are in this format.
     *
     * @param tokens
     * @param ignore
     * @returns {*}
     */
    function decodeGenePredExt(tokens, ignore) {

        var shift = this.shift === undefined ? 0 : 1;

        if (tokens.length < 11 + shift) return undefined;

        var feature = {
                name: tokens[11 + shift],
                chr: tokens[1 + shift],
                strand: tokens[2 + shift],
                start: parseInt(tokens[3 + shift]),
                end: parseInt(tokens[4 + shift]),
                cdStart: parseInt(tokens[5 + shift]),
                cdEnd: parseInt(tokens[6 + shift]),
                id: tokens[0 + shift]
            },
            exonCount = parseInt(tokens[7 + shift]),
            exonStarts = tokens[8 + shift].split(','),
            exonEnds = tokens[9 + shift].split(','),
            exons = [];

        for (var i = 0; i < exonCount; i++) {
            exons.push({start: parseInt(exonStarts[i]), end: parseInt(exonEnds[i])});
        }

        feature.exons = exons;

        return feature;

    }

    /**
     * Decode a UCSC "refFlat" record
     * @param tokens
     * @param ignore
     * @returns {*}
     */
    function decodeReflat(tokens, ignore) {

        var shift = this.shift === undefined ? 0 : 1;

        if (tokens.length < 10 + shift) return undefined;

        var feature = {
                name: tokens[0 + shift],
                id: tokens[1 + shift],
                chr: tokens[2 + shift],
                strand: tokens[3 + shift],
                start: parseInt(tokens[4 + shift]),
                end: parseInt(tokens[5 + shift]),
                cdStart: parseInt(tokens[6 + shift]),
                cdEnd: parseInt(tokens[7 + shift])
            },
            exonCount = parseInt(tokens[8 + shift]),
            exonStarts = tokens[9 + shift].split(','),
            exonEnds = tokens[10 + shift].split(','),
            exons = [];

        for (var i = 0; i < exonCount; i++) {
            exons.push({start: parseInt(exonStarts[i]), end: parseInt(exonEnds[i])});
        }

        feature.exons = exons;

        return feature;

    }

    function decodePeak(tokens, ignore) {

        var tokenCount, chr, start, end, strand, name, score, qValue, signal, pValue;

        tokenCount = tokens.length;
        if (tokenCount < 9) {
            return null;
        }

        chr = tokens[0];
        start = parseInt(tokens[1]);
        end = parseInt(tokens[2]);
        name = tokens[3];
        score = parseFloat(tokens[4]);
        strand = tokens[5].trim();
        signal = parseFloat(tokens[6]);
        pValue = parseFloat(tokens[7]);
        qValue = parseFloat(tokens[8]);

        if (score === 0) score = signal;

        return {
            chr: chr, start: start, end: end, name: name, score: score, strand: strand, signal: signal,
            pValue: pValue, qValue: qValue
        };
    }

    function decodeBedGraph(tokens, ignore) {

        var chr, start, end, value;

        if (tokens.length < 3) return null;

        chr = tokens[0];
        start = parseInt(tokens[1]);
        end = parseInt(tokens[2]);

        value = parseFloat(tokens[3]);

        // Optional extra columns
        if (this.header) {
            let colorColumn = this.header.colorColumn;
            if (colorColumn && colorColumn < tokens.length) {
                feature.color = igv.Color.createColorString(tokens[colorColumn])
            }
        }

        return {chr: chr, start: start, end: end, value: value};
    }

    function decodeWig(tokens, wig) {

        var ss,
            ee,
            value;

        if (wig.format === "fixedStep") {

            ss = (wig.index * wig.step) + wig.start;
            ee = ss + wig.span;
            value = parseFloat(tokens[0]);
            ++(wig.index);
            return isNaN(value) ? null : {chr: wig.chrom, start: ss, end: ee, value: value};
        }
        else if (wig.format === "variableStep") {

            if (tokens.length < 2) return null;

            ss = parseInt(tokens[0], 10);
            ee = ss + wig.span;
            value = parseFloat(tokens[1]);
            return isNaN(value) ? null : {chr: wig.chrom, start: ss, end: ee, value: value};

        }
        else {
            return decodeBedGraph(tokens);
        }
    }

    function decodeFusionJuncSpan(tokens, ignore) {

        /*
         Format:

         0       #scaffold
         1       fusion_break_name
         2       break_left
         3       break_right
         4       num_junction_reads
         5       num_spanning_frags
         6       spanning_frag_coords

         0       B3GNT1--NPSR1
         1       B3GNT1--NPSR1|2203-10182
         2       2203
         3       10182
         4       189
         5       1138
         6       1860-13757,1798-13819,1391-18127,1443-17174,...

         */


        //console.log("decoding fusion junc spans");

        var chr = tokens[0];
        var fusion_name = tokens[1];
        var junction_left = parseInt(tokens[2]);
        var junction_right = parseInt(tokens[3]);
        var num_junction_reads = parseInt(tokens[4]);
        var num_spanning_frags = parseInt(tokens[5]);

        var spanning_frag_coords_text = tokens[6];

        var feature = {
            chr: chr,
            name: fusion_name,
            junction_left: junction_left,
            junction_right: junction_right,
            num_junction_reads: num_junction_reads,
            num_spanning_frags: num_spanning_frags,
            spanning_frag_coords: [],

            start: -1,
            end: -1
        }; // set start and end later based on min/max of span coords

        var min_coord = junction_left;
        var max_coord = junction_right;

        if (num_spanning_frags > 0) {

            var coord_pairs = spanning_frag_coords_text.split(',');

            for (var i = 0; i < coord_pairs.length; i++) {
                var split_coords = coord_pairs[i].split('-');

                var span_left = split_coords[0];
                var span_right = split_coords[1];

                if (span_left < min_coord) {
                    min_coord = span_left;
                }
                if (span_right > max_coord) {
                    max_coord = span_right;
                }
                feature.spanning_frag_coords.push({left: span_left, right: span_right});

            }
        }

        feature.start = min_coord;
        feature.end = max_coord;


        return feature;

    }


    function decodeGtexGWAS(tokens, ignore) {
        //chrom	chromStart	chromEnd	Strongest SNP-risk allele	Disease/Phenotype	P-value	Odds ratio or beta	PUBMEDID
        //1	1247493	1247494	rs12103-A	Inflammatory bowel disease	8.00E-13	1.1	23128233

        const tokenCount = tokens.length;
        if (tokenCount < 7) {
            return null;
        }
        const feature =  {
            chr: tokens[0],
            start: parseInt(tokens[1]) - 1,
            end: parseInt(tokens[2]),
            'Strongest SNP-risk allele': tokens[3],
            'Disease/Phenotype': tokens[4],
            'P-value': tokens[5],
            'Odds ratio or beta': tokens[6],
        }
        if(tokens.length > 6) {
            'https://www.ncbi.nlm.nih.gov/pubmed/'
            feature['PUBMEDID'] = `<a target = "blank" href = "https://www.ncbi.nlm.nih.gov/pubmed/${tokens[7]}">${tokens[7]}</a>`
        }
        return feature
    }

    /**
     * Decode a single gff record (1 line in file).  Aggregations such as gene models are constructed at a higher level.
     *      ctg123 . mRNA            1050  9000  .  +  .  ID=mRNA00001;Parent=gene00001
     * @param tokens
     * @param ignore
     * @returns {*}
     */
    function decodeGFF(tokens, ignore) {

        var tokenCount, chr, start, end, strand, type, score, phase, attributeString, color, name,
            transcript_id, i,
            format = this.format;

        tokenCount = tokens.length;
        if (tokenCount < 9) {
            return null;      // Not a valid gff record
        }

        chr = tokens[0];
        type = tokens[2];
        start = parseInt(tokens[3]) - 1;
        end = parseInt(tokens[4]);
        score = "." === tokens[5] ? 0 : parseFloat(tokens[5]);
        strand = tokens[6];
        phase = "." === tokens[7] ? 0 : parseInt(tokens[7]);
        attributeString = tokens[8];

        // Find ID and Parent, or transcript_id
        var delim = ('gff3' === format) ? '=' : /\s+/;
        var attributes = {};
        for(let kv of  attributeString.split(';')) {
            const t = kv.trim().split(delim, 2)
            if (t.length == 2) {
                const key = t[0].trim();
                let value = t[1].trim();
                //Strip off quotes, if any
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substr(1, value.length - 2);
                }

                const keyLower = key.toLowerCase()
                if ("color" === keyLower || "colour" === keyLower) color = igv.Color.createColorString(t[1]);
                else {
                    attributes[key] = value;
                }
            }
        }

        // Find name (label) property
        if (this.nameField) {
            name = attributes[this.nameField];
        }
        else {
            for (i = 0; i < gffNameFields.length; i++) {
                if (attributes.hasOwnProperty(gffNameFields[i])) {
                    this.nameField = gffNameFields[i];
                    name = attributes[this.nameField];
                    break;
                }
            }
        }

        const id = attributes["ID"] || attributes["transcript_id"]
        const parent = attributes["Parent"]

        return new GFFFeature({
            id: id,
            parent: parent,
            name: name,
            type: type,
            chr: chr,
            start: start,
            end: end,
            score: score,
            strand: strand,
            color: color,
            attributeString: attributeString,
            delim: delim
        })

    }

    function GFFFeature(props) {
        Object.assign(this, props)
    }

    GFFFeature.prototype.popupData = function (genomicLocation) {
        const kvs = this.attributeString.split(';')
        const pd = [];
        pd.push({name: 'type', value: this.type})
        pd.push({name: 'start', value: this.start + 1})
        pd.push({name: 'end', value: this.end})
        for(let kv of kvs) {
            const t = kv.trim().split(this.delim, 2);
            if (t.length === 2 && t[1] !== undefined) {
                const key = t[0].trim();
                let value = t[1].trim();
                //Strip off quotes, if any
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substr(1, value.length - 2);
                }
                pd.push({name: key, value: value});
            }
        }
        return pd;
    }

    /**
     * AED file feature.
     *
     * @param aed link to the AED file object containing file-level metadata and column descriptors
     * @param allColumns All columns as parsed from the AED
     *
     * Other values are parsed one by one
     */
    function AedFeature(aed, allColumns) {
        var token, aedColumn, aedColumns = aed.columns;

        // Link to AED file (for metadata)
        this.aed = aed;

        // Unparsed columns from AED file
        this.allColumns = allColumns;

        // Prepare space for the parsed values
        this.chr = null;
        this.start = null;
        this.end = null;
        this.score = 1000;
        this.strand = '.';
        this.cdStart = null;
        this.cdEnd = null;
        this.name = null;
        this.color = null;

        for (i = 0; i < allColumns.length; i++) {
            token = allColumns[i];
            if (!token) {
                // Skip empty fields
                continue;
            }
            aedColumn = aedColumns[i];
            if (aedColumn.type === 'aed:Integer') {
                token = parseInt(token);
            }
            if (aedColumn.namespace === 'bio') {
                if (aedColumn.name === 'sequence') {
                    this.chr = token;
                }
                else if (aedColumn.name === 'start') {
                    this.start = token;
                }
                else if (aedColumn.name === 'end') {
                    this.end = token;
                }
                else if (aedColumn.name === 'cdsMin') {
                    this.cdStart = token;
                }
                else if (aedColumn.name === 'cdsMax') {
                    this.cdEnd = token;
                }
                else if (aedColumn.name === 'strand') {
                    this.strand = token;
                }
            }
            else if (aedColumn.namespace === 'aed') {
                if (aedColumn.name === 'name') {
                    this.name = token;
                }
            }
            else if (aedColumn.namespace === 'style') {
                if (aedColumn.name === 'color') {
                    this.color = igv.Color.createColorString(token);
                }
            }
        }
    }

    AedFeature.prototype.popupData = function () {
        var data = [],
            aed = this.aed;
        // Just dump everything we have for now
        for (var i = 0; i < this.allColumns.length; i++) {
            var featureValue = this.allColumns[i];
            var name = aed.columns[i].name;
            // Skip columns that are not interesting - you know the sequence, and you can see color
            if (name !== 'sequence' && name !== 'color') {
                if (featureValue) {
                    data.push({name: name, value: featureValue});
                }
            }
        }
        return data;
    };

    /**
     * Decode the AED file format
     * @param tokens
     * @param ignore
     * @returns decoded feature, or null if this is not a valid record
     */
    function decodeAed(tokens, ignore) {
        var name, value, token,
            nonEmptyTokens = 0,
            aedColumns = this.aed.columns,
            aedColumn,
            aedKey,
            i;

        // Each aed row must match the exact number of columns or we skip it
        if (tokens.length !== aedColumns.length) {
            console.log('Corrupted AED file row: ' + tokens.join(','));
            return undefined;
        }

        for (i = 0; i < tokens.length; i++) {
            aedColumn = aedColumns[i];
            token = tokens[i];
            if (token !== '') {
                nonEmptyTokens++;
            }
            if (aedColumn.name === 'name' && aedColumn.namespace === 'aed') {
                name = token;
            }
            else if (aedColumn.name === 'value' && aedColumn.namespace === 'aed') {
                value = token;
            }
        }

        if (nonEmptyTokens === 2 && name && value) {
            // Special row that defines metadata for the entire file
            aedKey = parseAedToken(name);
            // Store in the metadata section
            if (!this.aed.metadata[aedKey.namespace]) {
                this.aed.metadata[aedKey.namespace] = {};
            }
            if (!this.aed.metadata[aedKey.namespace][aedKey.name]) {
                this.aed.metadata[aedKey.namespace][aedKey.name] = {
                    type: aedKey.type,
                    value: value
                };
            }
            // Ignore this value
            return undefined;
        }

        var feature = new AedFeature(this.aed, tokens);

        if (!feature.chr || !feature.start || !feature.end) {
            console.log('Cannot parse feature: ' + tokens.join(','));
            return undefined;
        }

        return feature;
    }

    function decodeBedpe(tokens, ignore) {

        if (tokens.length < 6) {
            console.log("Skipping line: " + nextLine);
            return undefined;
        }

        var feature = {
            chr1: tokens[0],
            start1: Number.parseInt(tokens[1]),
            end1: Number.parseInt(tokens[2]),
            chr2: tokens[3],
            start2: Number.parseInt(tokens[4]),
            end2: Number.parseInt(tokens[5])
        }

        if (tokens.length > 6) {
            feature.name = tokens[6];
        }

        if (tokens.length > 7) {
            feature.score = tokens[7];
        }

        feature.chr = feature.chr1 === feature.chr2 ? feature.chr1 : "MIXED";

        // Start and end for the feature as a whole.  This needs revisited for interchr features
        feature.start = Math.min(feature.start1, feature.start2);
        feature.end = Math.max(feature.end1, feature.end2);

        // Midpoints
        let m1 = (feature.start1 + feature.end1) / 2;
        let m2 = (feature.start2 + feature.end2) / 2;
        feature.m1 = (m1 < m2) ? m1 : m2;
        feature.m2 = (m1 < m2) ? m2 : m1;

        // Optional extra columns
        if (this.header) {
            let thicknessColumn = this.header.thicknessColumn;
            let colorColumn = this.header.colorColumn;
            if (colorColumn && colorColumn < tokens.length) {
                feature.color = igv.Color.createColorString(tokens[colorColumn])
            }
            if (thicknessColumn && thicknessColumn < tokens.length) {
                feature.thickness = tokens[thicknessColumn];
            }
        }

        return feature;
    }


    /**
     * Decode UCSC "interact" files.  See https://genome.ucsc.edu/goldenpath/help/interact.html
     * @param tokens
     * @param ignore
     * @returns {*}
     */
    function decodeInteract(tokens, ignore) {

        if (tokens.length < 6) {
            console.log("Skipping line: " + nextLine);
            return undefined;
        }

        var feature = {
            chr1: tokens[8],
            start1: Number.parseInt(tokens[9]),
            end1: Number.parseInt(tokens[10]),
            chr2: tokens[13],
            start2: Number.parseInt(tokens[14]),
            end2: Number.parseInt(tokens[15]),

            name: tokens[3],
            score: Number.parseFloat(tokens[4]),
            value: Number.parseFloat(tokens[5]),
            color: tokens[6]

        }

        feature.chr = feature.chr1 === feature.chr2 ? feature.chr1 : "MIXED";

        // Start and end for the feature as a whole.  This needs revisited for interchr features
        feature.start = Math.min(feature.start1, feature.start2);
        feature.end = Math.max(feature.end1, feature.end2);

        // Midpoints
        let m1 = (feature.start1 + feature.end1) / 2;
        let m2 = (feature.start2 + feature.end2) / 2;
        feature.m1 = (m1 < m2) ? m1 : m2;
        feature.m2 = (m1 < m2) ? m2 : m1;

        // Optional extra columns
        if (this.header) {
            let thicknessColumn = this.header.thicknessColumn;
            let colorColumn = this.header.colorColumn;
            if (colorColumn && colorColumn < tokens.length) {
                feature.color = igv.Color.createColorString(tokens[colorColumn])
            }
            if (thicknessColumn && thicknessColumn < tokens.length) {
                feature.thickness = tokens[thicknessColumn];
            }
        }

        return feature;
    }

    /**
     * Special decoder for Hic Domain files.   In these files feature1 == feature2, they are really bed records.
     * @param tokens
     * @param ignore
     * @returns {*}
     */
    function decodeBedpeDomain(tokens, ignore) {

        return {
            chr: tokens[0],
            start: Number.parseInt(tokens[1]),
            end: Number.parseInt(tokens[2]),
            color: igv.Color.createColorString(tokens[6]),
            score: Number.parseFloat(tokens[7])
        };
    }


    function decodeSNP(tokens, ignore) {

        const autoSql = [
            'bin',
            'chr',
            'start',
            'end',
            'name',
            'score',
            'strand',
            'refNCBI',
            'refUCSC',
            'observed',
            'molType',
            'class',
            'valid',
            'avHet',
            'avHetSE',
            'func',
            'locType',
            'weight',
            'exceptions',
            'submitterCount',
            'submitters',
            'alleleFreqCount',
            'alleles',
            'alleleNs',
            'alleleFreqs',
            'bitfields'
        ];

        const feature = {
            chr: tokens[1],
            start: Number.parseInt(tokens[2]),
            end: Number.parseInt(tokens[3]),
            name: tokens[4],
            score: Number.parseInt(tokens[5])
        };

        const n = Math.min(tokens.length, autoSql.length);
        for (let i = 6; i < n; i++) {
            feature[autoSql[i]] = tokens[i];
        }
        return feature;

    }


    /**
     * Decode a custom columnar format.  Required columns are 'chr' and 'start'
     *
     * @param tokens
     * @param ignore
     * @returns decoded feature, or null if this is not a valid record
     */
    function decodeCustom(tokens, ignore) {

        const format = this.format;         // "this" refers to FeatureParser instance
        const coords = format.coords || 0;

        // Insure that chr and start fields are defined.
        //if(!this.format.chr && this.format.start) {
        //}


        const chr = tokens[format.chr];
        const start = parseInt(tokens[format.start]) - coords;
        const end = format.end !== undefined ? parseInt(tokens[format.end]) : start + 1;

        const feature = {chr: chr, start: start, end: end};

        if (format.fields) {

            format.fields.forEach(function (field, index) {

                if (index != format.chr &&
                    index != format.start &&
                    index != format.end) {

                    feature[field] = tokens[index];
                }
            });
        }

        return feature;

    }


    function expandFormat(format) {

        const fields = format.fields;
        const keys = ['chr', 'start', 'end'];

        for (let i = 0; i < fields.length; i++) {
            for (let key of keys) {
                if (key === fields[i]) {
                    format[key] = i;
                }
            }
        }

        return format;
    }


    return igv;
})
(igv || {});
