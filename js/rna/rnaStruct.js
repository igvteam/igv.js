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

"use strict";

var igv = (function (igv) {

        // TODO -- chr aliasing

        igv.RnaStructTrack = function (config, browser) {

            this.browser = browser;
            this.config = config;
            this.url = config.url;
            igv.configTrack(this, config);


            this.theta = Math.PI / 2;
        }

        igv.RnaStructTrack.prototype.getFeatures = function (chr, start, end) {

            const self = this;
            const genome = this.browser.genome;

            if (!this.featureCache) {

                const options = igv.buildOptions(this.config);

                return igv.xhr.loadString(self.config.url, options)

                    .then(function (data) {

                        self.featureCache = new igv.FeatureCache(parseBP(data), genome);

                        return self.featureCache.queryFeatures(chr, start, end);

                    });

            }
            else {
                return Promise.resolve(self.featureCache.queryFeatures(chr, start, end));
            }

        }

        igv.RnaStructTrack.prototype.draw = function (options) {

            const self = this;


            const ctx = options.context;
            const pixelWidth = options.pixelWidth;
            const pixelHeight = options.pixelHeight;
            const viewportWidth = options.viewportWidth;
            const bpPerPixel = options.bpPerPixel;
            const bpStart = options.bpStart;
            const xScale = bpPerPixel;

            igv.graphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

            const featureList = options.features;

            if (featureList) {

                featureList.forEach(function (feature) {

                    let pixelStart = Math.round((feature.startLeft - bpStart) / xScale);
                    let pixelStartR = Math.round((feature.startRight - bpStart) / xScale);
                    let pixelEnd = Math.round((feature.startLeft - bpStart) / xScale);
                    let pixelEndR = Math.round((feature.endLeft - bpStart) / xScale);
                    let direction = self.arcOrientation;

                    let w = (pixelEnd - pixelStart);
                    if (w < 3) {
                        w = 3;
                        pixelStart--;
                    }

                    const a = w / 2;
                    const r = a / self.sinTheta;
                    const b = self.cosTheta * r;
                    const xc = pixelStart + a;

                    let yc, startAngle, endAngle;
                    if (direction) {
                        // UP
                        var trackBaseLine = self.height;
                        yc = trackBaseLine + b;
                        startAngle = Math.PI;
                        endAngle = 2 * Math.PI;

                    } else {
                        // DOWN
                        yc = -b;
                        startAngle = 0;
                        endAngle = Math.PI;
                    }

                    let color = feature.color || self.color;
                    if (color && w > viewportWidth) {
                        color = getAlphaColor.call(self, color, "0.1");
                    }

                    ctx.strokeStyle = color;
                    ctx.fillStyle = color;
                    //ctx.lineWidth = feature.thickness || self.thicknewss || 1;

                    ctx.moveTo(pixelStart, yc);

                    ctx.beginPath();
                    ctx.arc(xc, yc, r, startAngle, endAngle, false);
                    ctx.stroke();


                })
            }
        }


        function parseBP(data) {

            if (!data) return null;

            const dataWrapper = igv.getDataWrapper(data);

            let header = true;
            let line;
            const colors = [];
            const features = [];

            while (line = dataWrapper.nextLine()) {

                const tokens = line.split('\t');

                if (header && line.startsWith("color:")) {
                    const color = "rgb(" + tokens[0] + "," + tokens[1] + "," + tokens[2] + ")";
                    colors.push(color);
                }
                else {
                    header = false;

                    const chr = tokens[0];
                    const startLeftNuc = Number.parseInt(tokens[1]) - 1; // stick to IGV's 0-based coordinate convention
                    const startRightNuc = Number.parseInt(tokens[2]) - 1;
                    const endLeftNuc = Number.parseInt(tokens[3]) - 1;
                    const endRightNuc = Number.parseInt(tokens[4]) - 1;
                    const color = colors[Number.parseInt(tokens[5])];

                    let feature;
                    if (startLeftNuc <= endRightNuc) {
                        feature = {
                            chr: chr,
                            startLeft: Math.min(startLeftNuc, startRightNuc),
                            startRight: Math.max(startLeftNuc, startRightNuc),
                            endLeft: Math.min(endLeftNuc, endRightNuc),
                            endRight: Math.max(endLeftNuc, endRightNuc),
                            color: color
                        }
                    } else {
                        feature = {
                            chr: chr,
                            startLeft: Math.min(endLeftNuc, endRightNuc),
                            startRight: Math.max(endLeftNuc, endRightNuc),
                            endLeft: Math.min(startLeftNuc, startRightNuc),
                            endRight: Math.max(startLeftNuc, startRightNuc),
                            color: color
                        }
                    }

                    feature.start = feature.startLeft;
                    feature.end = feature.endRight;

                    features.push(feature);
                }
            }

            return features;
        }

        return igv;
    }


)(igv || {});
