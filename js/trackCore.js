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

    var knownFileExtensions = new Set(["narrowpeak", "broadpeak", "peaks", "bedgraph", "wig", "gff3", "gff",
        "gtf", "aneu", "fusionjuncspan", "refflat", "seg", "bed", "vcf", "bb", "bigbed", "bw", "bigwig", "bam", "tdf",
        "refgene", "genepred", "genepredext"]);

    igv.getFormat = function (name) {

        if (undefined === igv.browser || undefined === igv.browser.formats) {
            return undefined;
        } else {
            return igv.browser.formats[name];
        }

    };

    igv.createTrack = function (conf) {

        var type = (undefined === conf.type) ? 'unknown_type' : conf.type.toLowerCase();

        switch (type) {

            case "gwas":
                return new igv.GWASTrack(conf);
                break;

            case "annotation":
            case "genes":
            case "fusionjuncspan":
            case "snp":
                return new igv.FeatureTrack(conf);
                break;

            case "variant":
                return new igv.VariantTrack(conf);
                break;

            case "alignment":
                return new igv.BAMTrack(conf);
                break;

            case "data":  // deprecated
            case "wig":
                return new igv.WIGTrack(conf);
                break;

            case "sequence":
                return new igv.SequenceTrack(conf);
                break;

            case "eqtl":
                return new igv.EqtlTrack(conf);
                break;

            case "seg":
                return new igv.SegTrack(conf);
                break;

            case "aneu":
                return new igv.AneuTrack(conf);
                break;

            case "merged":
                return new igv.MergedTrack(conf);

            default:
                return undefined;
        }

    };

    igv.inferTrackTypes = function (config) {

        function translateDeprecatedTypes(config) {

            if (config.featureType) {  // Translate deprecated "feature" type
                config.type = config.type || config.featureType;
                config.featureType = undefined;
            }

            if ("bed" === config.type) {
                config.type = "annotation";
                config.format = config.format || "bed";

            }

            else if ("bam" === config.type) {
                config.type = "alignment";
                config.format = "bam"
            }

            else if ("vcf" === config.type) {
                config.type = "variant";
                config.format = "vcf"
            }

            else if ("t2d" === config.type) {
                config.type = "gwas";
            }

            else if ("FusionJuncSpan" === config.type) {
                config.format = "fusionjuncspan";
            }
        }

        function inferFileFormat(config) {

            var path,
                fn,
                idx,
                ext;

            if (config.format) {
                config.format = config.format.toLowerCase();
                return;
            }

            path = igv.isFilePath(config.url) ? config.url.name : config.url;
            fn = path.toLowerCase();

            // Special case -- UCSC refgene files
            if (fn.endsWith("refgene.txt.gz") || fn.endsWith("refgene.txt")) {
                config.format = "refgene";
                return;
            }


            //Strip parameters -- handle local files later
            idx = fn.indexOf("?");
            if (idx > 0) {
                fn = fn.substr(0, idx);
            }

            //Strip aux extensions .gz, .tab, and .txt
            if (fn.endsWith(".gz")) {
                fn = fn.substr(0, fn.length - 3);
            }

            if (fn.endsWith(".txt") || fn.endsWith(".tab")) {
                fn = fn.substr(0, fn.length - 4);
            }


            idx = fn.lastIndexOf(".");
            ext = idx < 0 ? fn : fn.substr(idx + 1);

            switch (ext.toLowerCase()) {
                case "bw":
                    config.format = "bigwig";
                    break;
                case "bb":
                    config.format = "bigbed";

                default:
                    if (knownFileExtensions.has(ext)) {
                        config.format = ext;
                    }
            }
        }

        function inferTrackType(config) {

            if (config.type) return;

            if (config.format !== undefined) {
                switch (config.format.toLowerCase()) {
                    case "bw":
                    case "bigwig":
                    case "wig":
                    case "bedgraph":
                    case "tdf":
                        config.type = "wig";
                        break;
                    case "vcf":
                        config.type = "variant";
                        break;
                    case "seg":
                        config.type = "seg";
                        break;
                    case "bam":
                        config.type = "alignment";
                        break;
                    default:
                        config.type = "annotation";
                }
            }
        }

        translateDeprecatedTypes(config);

        if (undefined === config.sourceType && config.url) {
            config.sourceType = "file";
        }

        if ("file" === config.sourceType) {
            if (undefined === config.format) {
                inferFileFormat(config);
            }
        }

        if (undefined === config.type) {
            inferTrackType(config);
        }


    };

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
            if (igv.isFilePath(config.url)) track.name = config.url.name;
            else track.name = config.url;

        }

        track.id = config.id || track.name;   // TODO -- remove this property, not used

        track.order = config.order;
        track.color = config.color || igv.browser.constants.defaultColor || "rgb(0,0,150)";

        track.removable = config.removable === undefined ? true : config.removable;      // Defaults to true

        track.height = config.height || 100;

        if (config.autoHeight === undefined)  config.autoHeight = config.autoheight; // Some case confusion in the initial releasae

        track.autoHeight = config.autoHeight === undefined ? (config.height === undefined) : config.autoHeight;
        track.minHeight = config.minHeight || Math.min(50, track.height);
        track.maxHeight = config.maxHeight || Math.max(500, track.height);

        if (config.visibilityWindow) {
            track.visibilityWindow = config.visibilityWindow;
        }

        if (track.type === undefined) {
            track.type = config.type;
        }

    };

    igv.setTrackLabel = function (track, label) {

        var vp = _.first(track.trackView.viewports);

        track.name = label;

        vp.$viewport.find('.igv-track-label').html(track.name);

        if (track.trackView) {
            track.trackView.repaint();
        }
    };

    igv.inferIndexPath = function (url, extension) {

        var path, idx;

        if (url instanceof File) {
            throw new Error("Cannot infer an index path for a local File.  Please select explicitly")
        }

        if (url.includes("?")) {
            idx = url.indexOf("?");
            return url.substring(0, idx) + "." + extension + url.substring(idx);
        } else {
            return url + "." + extension;
        }


    };

    igv.paintAxis = function (ctx, pixelWidth, pixelHeight) {

        var x1,
            x2,
            y1,
            y2,
            a,
            b,
            reference,
            shim,
            font = {
                'font': 'normal 10px Arial',
                'textAlign': 'right',
                'strokeStyle': "black"
            };

        if (undefined === this.dataRange || undefined === this.dataRange.max || undefined === this.dataRange.min) {
            return;
        }

        igv.graphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        reference = 0.95 * pixelWidth;
        x1 = reference - 8;
        x2 = reference;

        //shim = 0.5 * 0.125;
        shim = .01;
        y1 = y2 = shim * pixelHeight;

        a = {x: x2, y: y1};

        // tick
        igv.graphics.strokeLine(ctx, x1, y1, x2, y2, font);
        igv.graphics.fillText(ctx, prettyPrint(this.dataRange.max), x1 + 4, y1 + 12, font);

        //shim = 0.25 * 0.125;
        y1 = y2 = (1.0 - shim) * pixelHeight;

        b = {x: x2, y: y1};

        // tick
        igv.graphics.strokeLine(ctx, x1, y1, x2, y2, font);
        igv.graphics.fillText(ctx, prettyPrint(this.dataRange.min), x1 + 4, y1 - 4, font);

        igv.graphics.strokeLine(ctx, a.x, a.y, b.x, b.y, font);

        function prettyPrint(number) {
            // if number >= 100, show whole number
            // if >= 1 show 1 significant digits
            // if <  1 show 2 significant digits

            if (number === 0) {
                return "0";
            } else if (Math.abs(number) >= 10) {
                return number.toFixed();
            } else if (Math.abs(number) >= 1) {
                return number.toFixed(1);
            } else {
                return number.toFixed(2);
            }
        }

    };

    /**
     * Configure item list for contextual (right-click) track popup menu.
     * @param popover
     * @param viewport
     * @param genomicLocation - (bp)
     * @param xOffset - (pixels) within track extent
     * @param yOffset - (pixels) within track extent
     */
    igv.trackContextMenuItemList = function (viewport, genomicLocation, xOffset, yOffset) {

        var config,
            menuItems;

        config =
        {
            viewport: viewport,
            genomicState: viewport.genomicState,
            genomicLocation: genomicLocation,
            x: xOffset,
            y: yOffset
        };

        menuItems = [];
        if (typeof viewport.trackView.track.contextMenuItemList === "function") {
            menuItems = viewport.trackView.track.contextMenuItemList(config);
        }

        return menuItems;
    };

    /**
     * Configure item list for track "gear" menu.
     * @param popover
     * @param trackView
     */
    igv.trackMenuItemList = function (popover, trackView) {

        var menuItems = [],
            all;

        if (trackView.track.config.type !== 'sequence') {

            menuItems.push(igv.trackMenuItem(trackView, "Set track name", function () {
                return "Track Name"
            }, trackView.track.name, function () {

                var value;

                value = igv.dialog.$dialogInput.val().trim();
                value = ('' === value || undefined === value) ? 'untitled' : value;

                igv.setTrackLabel(trackView.track, value);

                trackView.update();

            }, undefined));

            menuItems.push(igv.trackMenuItem(trackView, "Set track height", function () {
                return "Track Height"
            }, trackView.trackDiv.clientHeight, function () {

                var number = parseFloat(igv.dialog.$dialogInput.val(), 10);

                if (undefined !== number) {

// If explicitly setting the height adust min or max, if neccessary.
                    if (trackView.track.minHeight !== undefined && trackView.track.minHeight > number) {
                        trackView.track.minHeight = number;
                    }
                    if (trackView.track.maxHeight !== undefined && trackView.track.maxHeight < number) {
                        trackView.track.minHeight = number;
                    }
                    trackView.setTrackHeight(number, true, true);
                    trackView.track.autoHeight = false;   // Explicitly setting track height turns off autoHeight

                }

            }, undefined));
        }

        if (igv.doProvideColoSwatchWidget(trackView.track)) {
            menuItems.push(igv.colorPickerMenuItem(trackView))
        }

        all = [];
        if (trackView.track.menuItemList) {
            all = menuItems.concat(trackView.track.menuItemList());
        }

        if (trackView.track.removable !== false) {
            all.push(igv.trackRemovalMenuItem(trackView));
        }

        return all;
    };

    igv.doProvideColoSwatchWidget = function (track) {
        return (track instanceof igv.BAMTrack || track instanceof igv.FeatureTrack || track instanceof igv.VariantTrack || track instanceof igv.WIGTrack);
    };

    igv.trackMenuItemListHelper = function (itemList, $popover) {

        var list = [];

        if (itemList.length > 0) {

            list = itemList.map(function (item, i) {
                var $e;

                // name and object fields checked for backward compatibility
                if (item.name) {
                    $e = $('<div>');
                    $e.text(item.name);
                } else if (item.object) {
                    $e = item.object
                }
                else if (typeof item.label === 'string') {
                    $e = $('<div>');
                    $e.text(item.label)
                }
                else {
                    $e = $(item.label);
                }

                if (0 === i) {
                    $e.addClass('igv-track-menu-border-top');
                }

                if (item.click) {
                    $e.click(function () {
                        item.click();
                        $popover.hide();
                    });
                }

                return {object: $e, init: (item.init || undefined)};
            });
        }

        return list;
    };

    /**
     * Configure item for track "gear" menu.
     * @param trackView
     * @param menuItemLabel - menu item string
     * @param dialogLabelHandler - dialog label creation handler
     * @param dialogInputValue
     * @param dialogClickHandler
     * @param doAddTopBorder
     */
    igv.trackMenuItem = function (trackView, menuItemLabel, dialogLabelHandler, dialogInputValue, dialogClickHandler, doAddTopBorder) {

        var $e,
            clickHandler;

        $e = $('<div>');

        if (true === doAddTopBorder) {
            $e.addClass('igv-track-menu-border-top');
        }

        $e.text(menuItemLabel);


        clickHandler = function () {
            var $element = $(trackView.trackDiv);

            if ('Remove track' === menuItemLabel) {
                igv.trackRemovalDialog.configure({name: dialogLabelHandler(), click: dialogClickHandler});
                igv.trackRemovalDialog.present($(trackView.trackDiv));
            } else {
                igv.dialog.configure(dialogLabelHandler, dialogInputValue, dialogClickHandler, undefined, undefined);
                igv.dialog.show($element);
            }
        };

        return {object: $e, click: clickHandler};
    };

    igv.trackRemovalMenuItem = function (trackView) {

        var $e,
            menuClickHandler;

        $e = $('<div>');
        $e.addClass('igv-track-menu-border-top');
        $e.text('Remove track');

        menuClickHandler = function () {
            var dialogClickHandler;

            dialogClickHandler = function () {
                trackView.browser.removeTrack(trackView.track);
            };

            igv.trackRemovalDialog.configure({ name: trackView.track.name, click: dialogClickHandler });
            igv.trackRemovalDialog.present($(trackView.trackDiv));
        };

        return { object: $e, click: menuClickHandler };

    };

    igv.dataRangeMenuItem = function (trackView) {

        var $e,
            clickHandler;

        $e = $('<div>');
        $e.text('Set data range');

        clickHandler = function () {
            igv.dataRangeDialog.configureWithTrackView(trackView);
            igv.dataRangeDialog.show();
        };

        return {object: $e, click: clickHandler};
    };

    igv.colorPickerMenuItem = function (trackView) {
        var $e;

        $e = $('<div>');
        $e.text('Set track color');

        clickHandler = function () {
            trackView.$colorpicker_container.toggle();
        };

        return {object: $e, click: clickHandler};

    };

    return igv;
})(igv || {});
