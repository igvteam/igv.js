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


// Generic functions applicable to all track types

var igv = (function (igv) {

    /**
     * Set defaults for properties applicable to all tracks.
     * Insure required "config" properties are set.
     * @param track
     * @param config
     */
    igv.configTrack = function (track, config) {

        track.config = config;
        track.url = config.url;

        config.name = config.name || config.label;   // synonym for name, label is deprecated
        if (config.name) {
            track.name = config.name;
        }
        else {
            if (config.localFile) track.name = config.localFile.name;
            else track.name = config.url;

        }

        track.id = config.id || track.name;
        track.order = config.order;
        track.color = config.color || igv.constants.defaultColor;

        track.removable = (config.removable === undefined ? true : config.removable);      // Defaults to true

        track.height = config.height || ("bed" === config.type ? 100 : 50);
        track.autoHeight = (config.autoHeight === undefined ? true : config.autoHeight);
        track.minHeight = config.minHeight || Math.min(25, this.height);
        track.maxHeight = config.maxHeight || Math.max(500, this.height);

        // Set maxRows -- protects against pathological feature and bam packing cases
        if (config.maxRows === undefined) config.maxRows = 500;
        track.maxRows = config.maxRows;

        if (config.visibilityWindow) {
            track.visibilityWindow = config.visibilityWindow;
        }
        else if ("variant" === config.featureType) {
            config.visibilityWindow = 1000000;
            track.visibilityWindow = config.visibilityWindow;
        }

    };


    /**
     * Infer properties format, trackType, and renderType
     *
     * @param config
     */
    igv.inferTypes = function (config) {

        var sourceType = config.sourceType || "file";

        // Check for (deprecated) type property and translate, otherwise infer missing values
        if (config.type) {
            translateTypeField(config);
        }
        else {
            if ("file" === sourceType) {
                if (config.format === undefined ) {
                    inferFileFormat(config);
                }
                inferFeatureType(config);
            }
        }


        function inferFileFormat(config) {

            var path = config.url || config.localFile.name,
                fn = path.toLowerCase(),
                idx,
                ext;

            if (fn.endsWith(".gz")) {
                fn = fn.substr(0, fn.length - 3);
            } else if (fn.endsWith(".txt") || fn.endsWith(".tab")) {
                fn = fn.substr(0, fn.length - 4);
            }

            idx = fn.lastIndexOf(".");
            ext = idx < 0 ? fn : fn.substr(idx);

            switch (ext) {

                case ".bw":
                case ".bigwig":
                    config.format = config.format || "bigwig";
                    break;
                case ".bb":
                case ".bigbed":
                    config.format = config.format || "bigbed";
                case ".gff3":
                case ".gtf":
                    config.format = config.format || "gff";
                default:
                    config.format = ext.substr(1);   // Strip leading "."
            }
        }

        function inferFeatureType(config) {

            switch (config.format) {
                case "bw":
                case "bigwig":
                case "wig":
                case "bedgraph":
                    config.featureType = config.featureType || "data";
                    break;
                case "vcf":
                    config.featureType = config.featureType || "variant";
                    break;
                case "seg":
                    config.featureType = config.featureType || "seg";
                    break;
                case "bam":
                    config.featureType = config.featureType || "alignment";
                    break;
                default:
                    config.featureType = config.featureType || "annotation";

            }
        }


        /**
         * Translate the deprecated "type"
         *
         * @param config
         */
        function translateTypeField(config) {
            switch (config.type) {
                case "bed":
                    config.format = "bed";
                    config.featureType = "annotation";
                    break;
                case "vcf":
                    config.format = "vcf";
                    config.featureType = "variant";
                    break;
                case "FusionJuncSpan":
                    config.format = "FusionJuncSpan";
                    config.featureType = "FusionJuncSpan";
                    break;
                case "wig":
                    config.format = "wig";
                    config.featureType = "data";
                    config.renderType = "wig";
                    break;
                case "bigwig":
                    config.format = "bigwig";
                    config.featureType = "data";
                    config.renderType = "wig";
                    break;
                case "bedgraph":
                    config.format = "bedgraph";
                    config.featureType = "data";
                    config.renderType = "wig";
                    break;
                case "seg":
                    config.format = "seq";
                    config.featureType = "seg";
                    break;
                case "aneu":
                    config.format = "aneu";
                    config.featureType = "aneu";
                    break;
                case "t2d":
                    config.featureType = "gwas";
                    break;
                case "gtexGWAS":
                    config.format = "gtexGWAS";
                    config.featureType = "gwas";
                    break;
                case "eqtl":
                    config.format = "eqtl";
                    config.featureType = "eqtl";
                    break;
                case "bam":
                    config.format = "bam";
                    config.featureType = "alignment";
                    break;
                case "sequence":
                    config.featureType = "sequence";
                    config.sequenceType = "dna";
                    break;
                default:
            }
        }
    }


    igv.setTrackLabel = function (track, label) {

        track.name = label;

        if (track.description) {

            track.labelButton.innerHTML = track.name;
        } else {

            if ("CURSOR" !== this.browser.type) {
                track.labelSpan.innerHTML = track.name;
            }
            else {

                // handle CURSOR track label
                track.trackLabelDiv.innerHTML = track.name
            }
        }

        if (track.trackView) {
            track.trackView.repaint();
        }
    };

    igv.setTrackColor = function (track, color) {

        track.color = color;

        if (track.trackView) {

            track.trackView.repaint();

            if ("CURSOR" === this.browser.type) {
                if (track.cursorHistogram) {
                    track.cursorHistogram.render(track);
                }
            }

        }

    };


    return igv;
})(igv || {});