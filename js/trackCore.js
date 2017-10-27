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

    igv.createTrackWithConfiguration = function (conf) {

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

            //Strip parameters -- handle local files later
            idx = fn.indexOf("?");
            if (idx > 0) {
                fn = fn.substr(0, idx);
            }

            //Strip aux extensions .gz, .tab, and .txt
            if (fn.endsWith(".gz")) {
                fn = fn.substr(0, fn.length - 3);
            } else if (fn.endsWith(".txt") || fn.endsWith(".tab")) {
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

        track.height = config.height || ('wig' === config.type ? 50 : 100);

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


    }

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
    igv.trackPopupMenuItemList = function (popover, viewport, genomicLocation, xOffset, yOffset) {

        var config,
            menuItems;

        config =
        {
            popover: popover,
            viewport: viewport,
            genomicLocation: genomicLocation,
            x: xOffset,
            y: yOffset
        };

        menuItems = [];
        if (viewport.trackView.track.popupMenuItemList) {
            menuItems = igv.trackMenuItemListHelper(viewport.trackView.track.popupMenuItemList(config));
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

        menuItems.push(igv.trackMenuItem(popover, trackView, "Set track name", function () {
            return "Track Name"
        }, trackView.track.name, function () {

            var alphanumeric = parseAlphanumeric(igv.dialog.$dialogInput.val());

            if (undefined !== alphanumeric) {
                igv.setTrackLabel(trackView.track, alphanumeric);
                trackView.update();
            }

            function parseAlphanumeric(value) {

                var alphanumeric_re = /(?=.*[a-zA-Z].*)([a-zA-Z0-9 ]+)/,
                    alphanumeric = alphanumeric_re.exec(value);

                return (null !== alphanumeric) ? alphanumeric[0] : "untitled";
            }

        }, undefined));

        menuItems.push(igv.trackMenuItem(popover, trackView, "Set track height", function () {
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
                trackView.setTrackHeight(number);
                trackView.track.autoHeight = false;   // Explicitly setting track height turns off autoHeight

            }

        }, undefined));

        if (igv.colorPicker && isValidTrack(trackView.track)) {
            menuItems.push(igv.colorPickerMenuItem(popover, trackView))
        }

        all = [];
        if (trackView.track.menuItemList) {
            all = menuItems.concat(igv.trackMenuItemListHelper(trackView.track.menuItemList(popover)));
        }

        if (trackView.track.removable !== false) {

            all.push(
                igv.trackMenuItem(popover, trackView, "Remove track", function () {
                    var label = "Remove " + trackView.track.name;
                    return '<div class="igv-dialog-label-centered">' + label + '</div>';
                }, undefined, function () {
                    popover.hide();
                    trackView.browser.removeTrack(trackView.track);
                    // trackView.browser.removeTrackByName(trackView.track.name);
                }, true)
            );
        }

        function isValidTrack(track) {
            return track instanceof igv.BAMTrack || track instanceof igv.FeatureTrack || track instanceof igv.VariantTrack || track instanceof igv.WIGTrack;
        }

        return all;
    };

    igv.trackMenuItemListHelper = function (itemList) {

        var list = [];

        if (_.size(itemList) > 0) {

            list = _.map(itemList, function (item, i) {
                var $e;

                if (item.name) {
                    $e = $('<div>');
                    $e.text(item.name);
                } else {
                    $e = item.object
                }

                if (0 === i) {
                    $e.addClass('igv-track-menu-border-top');
                }

                if (item.click) {
                    $e.click(item.click);
                }

                return {object: $e, init: (item.init || undefined)};
            });
        }

        return list;
    };

    /**
     * Configure item for track "gear" menu.
     * @param popover - passed to allow menu-item handler to close popup
     * @param trackView
     * @param menuItemLabel - menu item string
     * @param dialogLabelHandler - dialog label creation handler
     * @param dialogInputValue
     * @param dialogClickHandler
     * @param doAddTopBorder
     */
    igv.trackMenuItem = function (popover, trackView, menuItemLabel, dialogLabelHandler, dialogInputValue, dialogClickHandler, doAddTopBorder) {

        var $e,
            clickHandler;

        $e = $('<div>');

        if (true === doAddTopBorder) {
            $e.addClass('igv-track-menu-border-top');
        }

        $e.text(menuItemLabel);


        clickHandler = function () {
            var $element = $(trackView.trackDiv);
            igv.dialog.configure(dialogLabelHandler, dialogInputValue, dialogClickHandler, undefined, undefined);
            igv.dialog.show($element);
            popover.hide();
        };

        $e.click(clickHandler);

        return {object: $e, init: undefined};
    };

    igv.dataRangeMenuItem = function (popover, trackView) {

        var $e,
            clickHandler;

        $e = $('<div>');
        $e.text('Set data range');

        clickHandler = function () {
            igv.dataRangeDialog.configureWithTrackView(trackView);
            igv.dataRangeDialog.show();
            popover.hide();
        };

        $e.click(clickHandler);

        return {object: $e, init: undefined};
    };

    igv.colorPickerMenuItem = function (popover, trackView) {
        var $e,
            clickHandler;


        $e = $('<div>');
        $e.text('Set track color');

        clickHandler = function () {
            var defaultColor,
                color,
                offset,
                colorUpdateHandler;

            color = trackView.track.color;

            defaultColor = trackView.track.config.color || igv.browser.constants.defaultColor;

            offset =
            {
                left: ($(trackView.trackDiv).offset().left + $(trackView.trackDiv).width()) - igv.colorPicker.$container.width(),
                top: $(trackView.trackDiv).offset().top
            };

            colorUpdateHandler = function (color) {
                trackView.setColor(color)
            };

            igv.colorPicker.configure(trackView, color, defaultColor, offset, colorUpdateHandler);

            igv.colorPicker.presentAtOffset(offset);

            popover.hide();
        };

        $e.click(clickHandler);

        return {object: $e, init: undefined};

    };

    return igv;
})(igv || {});
