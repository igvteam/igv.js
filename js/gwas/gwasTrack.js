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

import FeatureSource from '../feature/featureSource.js';
import TrackBase from "../trackBase.js";
import IGVGraphics from "../igv-canvas.js";
import {BinnedColorScale, ConstantColorScale} from "../util/colorScale.js";
import {doAutoscale, extend} from "../util/igvUtils.js";
import MenuUtils from "../ui/menuUtils.js";
import gwasColors from "./gwasColors.js"
import {randomColor} from "../util/colorPalletes.js"
import deepCopy from "../util/deepCopy.js"

const DEFAULT_POPOVER_WINDOW = 100000000;
//const type = "gwas";

class GWASTrack extends TrackBase {

    constructor(config, browser) {

        super(config, browser);
    }

    updateConfig(config, repaint) {
        super.updateConfig(config);

        this.useChrColors = config.useChrColors === undefined ? true : config.useChrColors;
        this.trait = config.trait;
        this.posteriorProbability = config.posteriorProbability;
        this.height = config.height || 100;   // The preferred height

        // Set initial range if specfied, unless autoscale == true
        if (!config.autoscale) {
            if (config.posteriorProbability) {
                this.dataRange = {
                    min: config.min === undefined ? 0 : config.min,
                    max: config.max === undefined ? 1 : config.max
                }
            } else {
                this.dataRange = {
                    min: config.min === undefined ? 0 : config.min,
                    max: config.max === undefined ? 25 : config.max
                }
            }
        }
        this.autoscale = config.autoscale;
        this.autoscalePercentile = config.autoscalePercentile === undefined ? 98 : config.autoscalePercentile;
        this.background = config.background;    // No default
        this.divider = config.divider || "rgb(225,225,225)";
        this.dotSize = config.dotSize || 3;
        this.popoverWindow = (config.popoverWindow === undefined ? DEFAULT_POPOVER_WINDOW : config.popoverWindow);
        this.description = config.description;  // might be null

        this.colorScales = config.color ?
            new ConstantColorScale(config.color) :
            {
                "*": new BinnedColorScale(config.colorScale || {
                    thresholds: [5e-8, 5e-4, 0.5],
                    colors: ["rgb(255,50,50)", "rgb(251,100,100)", "rgb(251,170,170)", "rgb(227,238,249)"],
                })
            }

        this.featureSource = FeatureSource(config, this.browser.genome);

        // update and repaint track if needed
        if (repaint) {
            this.trackView.checkContentHeight();
            this.trackView.repaintViews();
        }
    }

    supportsWholeGenome() {
        return true;
    }

    async getFeatures(chr, start, end) {
        return this.featureSource.getFeatures({chr, start, end});
    }

    draw(options) {

        const featureList = options.features;
        const ctx = options.context;
        const pixelWidth = options.pixelWidth;
        const pixelHeight = options.pixelHeight;
        if (this.background) {
            IGVGraphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': this.background});
        }
        IGVGraphics.strokeLine(ctx, 0, pixelHeight - 1, pixelWidth, pixelHeight - 1, {'strokeStyle': this.divider});

        if (featureList) {

            const bpPerPixel = options.bpPerPixel;
            const bpStart = options.bpStart;
            const bpEnd = bpStart + pixelWidth * bpPerPixel + 1;
            for (let variant of featureList) {
                const pos = variant.start;
                if (pos < bpStart) continue;
                if (pos > bpEnd) break;

                const colorScale = this.getColorScale(variant._f ? variant._f.chr : variant.chr);

                let color;
                let val;
                if (this.posteriorProbability) {
                    val = variant.value
                    color = colorScale.getColor(val);
                } else {
                    const pvalue = variant.value || variant.score;
                    if (!pvalue) continue;
                    val = -Math.log10(pvalue);
                    color = colorScale.getColor(val);
                }

                const yScale = (this.dataRange.max - this.dataRange.min) / pixelHeight;
                const px = Math.round((pos - bpStart) / bpPerPixel);
                const py = Math.max(this.dotSize, pixelHeight - Math.round((val - this.dataRange.min) / yScale));

                if (color) {
                    IGVGraphics.setProperties(ctx, {fillStyle: color, strokeStyle: "black"});
                }
                IGVGraphics.fillCircle(ctx, px, py, this.dotSize);
                variant.px = px;
                variant.py = py;
            }
        }
    }

    getColorScale(chr) {

        if (this.useChrColors) {
            let cs = this.colorScales[chr];
            if (!cs) {
                const color = gwasColors[chr] || randomColor();
                cs = new ConstantColorScale(color);
                this.colorScales[chr] = cs;
            }
            return cs;
        } else {
            return this.colorScales("*")
        }
    }

    paintAxis(ctx, pixelWidth, pixelHeight) {

        IGVGraphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});
        var font = {
            'font': 'normal 10px Arial',
            'textAlign': 'right',
            'strokeStyle': "black"
        };

        const yScale = (this.dataRange.max - this.dataRange.min) / pixelHeight;
        if (this.posteriorProbability) {
            const n = 0.1;
            for (let p = this.dataRange.min; p < this.dataRange.max; p += n) {
                const yp = pixelHeight - Math.round((p - this.dataRange.min) / yScale);
                IGVGraphics.strokeLine(ctx, 45, yp - 2, 50, yp - 2, font); // Offset dashes up by 2 pixel
                IGVGraphics.fillText(ctx, p.toFixed(1), 44, yp + 2, font); // Offset numbers down by 2 pixels;
            }
        } else {
            const n = Math.ceil((this.dataRange.max - this.dataRange.min) * 10 / pixelHeight);
            for (let p = this.dataRange.min; p < this.dataRange.max; p += n) {
                const yp = pixelHeight - Math.round((p - this.dataRange.min) / yScale);
                IGVGraphics.strokeLine(ctx, 45, yp, 50, yp, font); // Offset dashes up by 2 pixel
                IGVGraphics.fillText(ctx, Math.floor(p), 44, yp + 4, font); // Offset numbers down by 2 pixels;
            }
        }

        font['textAlign'] = 'center';
        if (this.posteriorProbability) {
            IGVGraphics.fillText(ctx, "PPA", pixelWidth / 2, pixelHeight / 2, font, {rotate: {angle: -90}});
        } else {
            IGVGraphics.fillText(ctx, "-log10(pvalue)", pixelWidth / 2, pixelHeight / 2, font, {rotate: {angle: -90}});
        }
    }

    popupData(clickState) {

        let data = [];
        const track = clickState.viewport.trackView.track;
        const features = clickState.viewport.getCachedFeatures();

        if (features) {
            let count = 0;
            for (let f of features) {
                const xDelta = Math.abs(clickState.canvasX - f.px);
                const yDelta = Math.abs(clickState.canvasY - f.py);
                const value = f.value || f.score
                if (xDelta < this.dotSize && yDelta < this.dotSize) {
                    if (count > 0) {
                        data.push("<HR/>")
                    }
                    if (count == 5) {
                        data.push("...");
                        break;
                    }
                    if (typeof f.popupData === 'function') {
                        data = data.concat(f.popupData())
                    } else {
                        const chr = f.realChr || f.chr;
                        const pos = (f.realStart || f.start) + 1;
                        data.push({name: 'chromosome', value: chr});
                        data.push({name: 'position', value: pos});
                        data.push({name: 'name', value: f.name});
                        if (track.posteriorProbability) {
                            data.push({name: 'posterior probability', value: value});
                        } else {
                            data.push({name: 'pValue', value: value});
                        }
                    }
                    count++;
                }
            }
        }

        return data;
    }

    menuItemList() {
        return MenuUtils.numericDataMenuItems(this.trackView);
    }

    doAutoscale(featureList) {

        if (featureList.length > 0) {
            // posterior probabilities are treated without modification, but we need to take a negative logarithm of P values
            const features = this.posteriorProbability ?
                featureList :
                featureList.map(function (feature) {
                    const v = feature.value !== undefined ? feature.value : feature.score;
                    return {value: -Math.log(v) / Math.LN10};
                });
            const range = doAutoscale(features);
            this.dataRange.max = range.max;
            this.dataRange.min = (range.min !== range.max) ? range.min : 0;

        } else {
            // No features -- pick something reasonable for PPAs and p-values
            if (this.posteriorProbability) {
                this.dataRange.min = this.config.min || 0;
                this.dataRange.max = this.config.max || 1;
            } else {
                this.dataRange.max = this.config.max || 25;
                this.dataRange.min = this.config.min || 0;
            }

        }

        return this.dataRange;
    }

}

export default GWASTrack

