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

/**
 * Created by jrobinso on 7/5/18.
 */

var igv = (function (igv) {


    igv.InteractionTrack = function (config) {

        igv.configTrack(this, config);

        this.theta = config.theta || Math.PI / 4;
        this.sinTheta = Math.sin(this.theta);
        this.cosTheta = Math.cos(this.theta);


        this.height = config.height || 250;
        this.autoHeight = true;

        this.arcDirection = (config.arcDirection === undefined ? true : config.arcDirection);       // true for up, false for down
        this.lineThickness = config.lineThicknes || 2;
        this.color = config.color || "rgb(180,25,137)"

        this.supportsWholeGenome = false;

    };

    /**
     * Return the current state of the track.  Used to create sessions and bookmarks.
     *
     * @returns {*|{}}
     */
    igv.InteractionTrack.prototype.getConfig = function () {

        var config = this.config || {};
        config.arcDirection = this.arcDirection;
        config.lineThicknes = this.lineThickness;
        config.color = this.color;
        return config;

    }


    igv.InteractionTrack.prototype.getFeatures = function (chr, bpStart, bpEnd) {

        var self = this;

        if (self.featureCache) {
            return Promise.resolve(self.featureCache.queryFeatures(chr, bpStart, bpEnd));
        }
        else {

            var self = this;
            var options = igv.buildOptions(self.config);    // Add oauth token, if any

            return igv.xhr.loadString(self.config.url, options)

                .then(function (data) {

                    var parser = new igv.FeatureParser("bedpe");
                    //self.header = parser.parseHeader(data);

                    var features = parser.parseFeatures(data);

                    self.featureCache = new igv.FeatureCache(features);

                    // TODO -- whole genome features here.

                    return features;

                })
        }
    };

    igv.InteractionTrack.prototype.draw = function (options) {

        var self = this,
            featureList, ctx, bpPerPixel, bpStart, pixelWidth, pixelHeight,
            bpEnd, segment, len, i, px, px1, xScale;

        ctx = options.context;
        pixelWidth = options.pixelWidth;
        pixelHeight = options.pixelHeight;
        igv.graphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        ctx.strokeStyle = self.color;
        ctx.lineWidth = self.lineThickness;

        featureList = options.features;
        if (featureList) {


            bpPerPixel = options.bpPerPixel;
            bpStart = options.bpStart;
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1;
            xScale = bpPerPixel;


            for (i = 0, len = featureList.length; i < len; i++) {

                segment = featureList[i];

                if (segment.end < bpStart) continue;
                if (segment.start > bpEnd) break;

                px = Math.round((segment.start - bpStart) / xScale);
                px1 = Math.round((segment.end - bpStart) / xScale);

                drawArc.call(this, ctx, px1, px, this.arcDirection);

            }
        }


        function drawArc(ctx, x1, x2, direction) {

            var pixelStart, pixelEnd, w, a, r, b, xc, yc, startAngle, endAngle;

            pixelStart = Math.min(x1, x2);
            pixelEnd = Math.max(x1, x2);

            //if(lineThickness > 1) g.setStroke(new BasicStroke(lineThickness));

            w = (pixelEnd - pixelStart);
            if (w < 3) {
                w = 3;
                pixelStart--;
            }

            a = w / 2;
            r = a / self.sinTheta;
            b = self.cosTheta * r;

            xc = pixelStart + a;



            if (direction) {
                // UP
                var trackBaseLine = self.height;
                yc = trackBaseLine + b;
                startAngle = Math.PI + Math.PI / 2 - self.theta;
                endAngle = Math.PI + Math.PI / 2 + self.theta;

            } else {
                // DOWN
                yc = -b;
                startAngle = Math.PI / 2 - self.theta;
                endAngle = Math.PI / 2 + self.theta;
            }

            ctx.beginPath();
            ctx.arc(xc, yc, r, startAngle, endAngle, false);
            ctx.stroke();
        }

    };


    igv.InteractionTrack.prototype.menuItemList = function () {

        var self = this;

        return [
            {
                name: "Toggle arc direction",
                click: function () {
                    self.arcDirection = !self.arcDirection;
                    self.trackView.repaintViews();
                }
            },
            {
                name: "Set track color",
                click: function () {
                    self.trackView.$colorpicker_container.toggle();
                }
            }

        ];

    };
    //
    //
    //
    // igv.InteractionTrack.prototype.popupData = function (config) {
    //    
    //     return null;
    // };

    // igv.InteractionTrack.prototype.contextMenuItemList = function (config) {
    //
    //     var self = this,
    //         clickHandler;
    //
    //
    //
    //     clickHandler = function () {
    //
    //         var genomicLocation = config.genomicLocation,
    //             referenceFrame = config.viewport.genomicState.referenceFrame;
    //
    //         // Define a region 5 "pixels" wide in genomic coordinates
    //         var bpWidth = referenceFrame.toBP(2.5);
    //
    //         self.sortSamples(referenceFrame.chrName, genomicLocation - bpWidth, genomicLocation + bpWidth, sortDirection);
    //
    //         sortDirection = (sortDirection === "ASC" ? "DESC" : "ASC");
    //
    //
    //     };
    //
    //     return [{label: 'Sort by value',  click: clickHandler, init: undefined}];
    //
    // };


    return igv;

})(igv || {});
