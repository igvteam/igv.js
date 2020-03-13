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
import T2DVariantSource from "./t2dVariantSource.js";
import TrackBase from "../trackBase.js";
import IGVGraphics from "../igv-canvas.js";
import {BinnedColorScale} from "../util/colorScale.js";
import {extend,doAutoscale} from "../util/igvUtils.js";
import MenuUtils from "../ui/menuUtils";
import {createCheckbox} from "../igv-icons.js";

const DEFAULT_POPOVER_WINDOW = 100000000;
//const type = "gwas";

const GWASTrack = extend(TrackBase,
    function (config, browser) {
        this.browser = browser;
        this.config = config;
        this.url = config.url;
        this.name = config.name;
        this.trait = config.trait;
        this.posteriorProbability = config.posteriorProbability;
        this.ppa = config.ppa;
        this.height = config.height || 100;   // The preferred height
        this.minLogP = config.minLogP || 0;
        this.maxLogP = config.maxLogP || 15;
        var min = config.minLogP || config.min;
        var max = config.maxLogP || config.max;
        this.dataRange = {
            min: min || 0,
            max: max || 25
        };

        if (!max) {
            this.autoscale = true;
        } else {
            this.autoscale = config.autoscale;
        }

        this.autoscalePercentile = config.autoscalePercentile === undefined ? 98 : config.autoscalePercentile;
        this.background = config.background;    // No default
        this.divider = config.divider || "rgb(225,225,225)";
        this.dotSize = config.dotSize || 4;
        this.popoverWindow = (config.popoverWindow === undefined ? DEFAULT_POPOVER_WINDOW : config.popoverWindow);

        this.description = config.description;  // might be null
        this.proxy = config.proxy;   // might be null

        this.portalURL = config.portalURL ? config.portalURL : window.location.origin;
        this.variantURL = config.variantURL || "http://www.type2diabetesgenetics.org/variant/variantInfo/";
        this.traitURL = config.traitURL || "http://www.type2diabetesgenetics.org/trait/traitInfo/";

        var cs = config.colorScale || {
            thresholds: [5e-8, 5e-4, 0.5],
            colors: ["rgb(255,50,50)", "rgb(251,100,100)", "rgb(251,170,170)", "rgb(227,238,249)"]
        };

        this.pvalue = config.pvalue ? config.pvalue : "PVALUE";
        this.ppa = config.ppa ? config.ppa : "PPA";

        this.colorScale = new BinnedColorScale(cs);

        // An obvious hack -- the source should be passed in as an arbument
        if (config.format && ("gtexgwas" === config.format.toLowerCase())) {
            this.featureSource = new FeatureSource(config, browser.genome);
        } else if (config.format && ("bedgwas" === config.format.toLowerCase())) {
            this.featureSource = new FeatureSource(config, browser.genome);
        } else{
            this.featureSource = new T2DVariantSource(config, browser.genome);
        }

    });

GWASTrack.prototype.getFeatures = function (chr, bpStart, bpEnd) {
    return this.featureSource.getFeatures(chr, bpStart, bpEnd);
};

GWASTrack.prototype.draw = function (options) {

    var track = this,
        featureList = options.features,
        ctx = options.context,
        bpPerPixel = options.bpPerPixel,
        bpStart = options.bpStart,
        pixelWidth = options.pixelWidth,
        pixelHeight = options.pixelHeight,
        bpEnd = bpStart + pixelWidth * bpPerPixel + 1,
        yScale = (track.dataRange.max - track.dataRange.min) / pixelHeight,
        enablePopover = (bpEnd - bpStart) < DEFAULT_POPOVER_WINDOW;

    if (enablePopover) {
        this.po = [];
    } else {
        this.po = undefined;
    }

    if (this.background) IGVGraphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': this.background});
    IGVGraphics.strokeLine(ctx, 0, pixelHeight - 1, pixelWidth, pixelHeight - 1, {'strokeStyle': this.divider});

    var variant, pos, len, xScale, px, px1, pw, py, color, pvalue, val;

    if (featureList) {
        len = featureList.length;

        for (var i = 0; i < len; i++) {

            variant = featureList[i];

            pos = variant.start;     // TODO fixme

            if (pos < bpStart) continue;
            if (pos > bpEnd) break;

            if (track.posteriorProbability){
                val = variant[track.ppa];
                color = track.colorScale.getColor(val);
            } else {
                pvalue = variant.pvalue || variant[track.pvalue];
                if (!pvalue) continue;
                color = track.colorScale.getColor(pvalue);
                val = -Math.log(pvalue) / 2.302585092994046;
            }


            xScale = bpPerPixel;

            px = Math.round((pos - bpStart) / xScale);

            py = Math.max(track.dotSize, pixelHeight - Math.round((val - track.dataRange.min) / yScale));

            if (color) IGVGraphics.setProperties(ctx, {fillStyle: color, strokeStyle: "black"});

            IGVGraphics.fillCircle(ctx, px, py, track.dotSize);

            if (enablePopover) track.po.push({x: px, y: py, feature: variant});

        }
    }

};

GWASTrack.prototype.paintAxis = function (ctx, pixelWidth, pixelHeight) {

    var track = this,
        yScale = (track.dataRange.max - track.dataRange.min) / pixelHeight;

    var font = {
        'font': 'normal 10px Arial',
        'textAlign': 'right',
        'strokeStyle': "black"
    };

    IGVGraphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

    if (track.posteriorProbability){
        var n = 0.1;
        for (var p = track.dataRange.min; p < track.dataRange.max; p += n) {
            var yp = pixelHeight - Math.round((p - this.dataRange.min) / yScale);
            IGVGraphics.strokeLine(ctx, 45, yp - 2, 50, yp - 2, font); // Offset dashes up by 2 pixel
            IGVGraphics.fillText(ctx, p.toFixed(1), 44, yp + 2, font); // Offset numbers down by 2 pixels;
        }
    } else {
        var n = Math.ceil((this.dataRange.max - this.dataRange.min) * 10 / pixelHeight);
        for (var p = track.dataRange.min; p < track.dataRange.max; p += n) {
            var yp = pixelHeight - Math.round((p - this.dataRange.min) / yScale);
            IGVGraphics.strokeLine(ctx, 45, yp - 2, 50, yp - 2, font); // Offset dashes up by 2 pixel
            IGVGraphics.fillText(ctx, Math.floor(p), 44, yp + 2, font); // Offset numbers down by 2 pixels;
        }

    }



    font['textAlign'] = 'center';

    if (track.posteriorProbability){
        IGVGraphics.fillText(ctx, "PPA", pixelWidth / 2, pixelHeight / 2, font, {rotate: {angle: -90}});
    } else {
        IGVGraphics.fillText(ctx, "-log10(pvalue)", pixelWidth / 2, pixelHeight / 2, font, {rotate: {angle: -90}});
    }



};


GWASTrack.prototype.popupData = function (config) {

    var genomicLocation = config.genomicLocation,
        yOffset = config.y,
        referenceFrame = config.viewport.genomicState.referenceFrame,
        i,
        len,
        p,
        dbSnp,
        url,
        data = [],
        chr,
        pos,
        beta,
        track=config.viewport.trackView.track,
        value;

    if (this.po) {

        const trackTotalRange = (track.dataRange.max - track.dataRange.min);
        const xDotSize = (referenceFrame.bpPerPixel*this.dotSize);
        const yDotSize = (trackTotalRange*this.dotSize/track.height);
        for (i = 0, len = this.po.length; i < len; i++) {
            p = this.po[i];
            const proportion =  (track.height-yOffset)/track.height;
            const valueForThisClick =  track.dataRange.min+(trackTotalRange*proportion);
            const xDelta = Math.abs(genomicLocation - p.feature.start);
            let yDelta;
            if (track.posteriorProbability){
                value = p.feature[this.ppa] || p.feature.ppa;
                yDelta = Math.abs(valueForThisClick - value);
            } else {
                value = p.feature[this.pvalue] || p.feature.pvalue;
                yDelta = Math.abs(valueForThisClick + Math.log10(value));
            }
            if ( (xDelta<xDotSize) &&(yDelta<yDotSize)){

                if (this.config.format === "bedgwas"){

                    chr = p.feature.chr;
                    pos = p.feature.start;
                    let refAllele = "";
                    let altAllele = "";
                    // our convention here is that the name field should contain the reference allele and the alternate
                    //  allele, separated by an underscore.  For example, "T_A"
                    if ( typeof p.feature.name === 'string'){
                        const alleles = p.feature.name.split('_');
                        if (alleles.length===2){
                            refAllele =  alleles[0];
                            altAllele = alleles[1];
                        }
                    }
                    const chrContent = chr.startsWith('chr')?chr.substring(3):chr;
                    const variantName = chrContent+"_"+pos+"_"+refAllele+"_"+altAllele;
                    url = this.traitURL.startsWith("http") ? this.traitURL : this.portalURL + "/" + this.traitURL;

                    data.push("<a target='_blank' href='" + url + (url.endsWith("/") ? "" : "/") + variantName + "'>" +
                        "explore "+variantName+"</a>");
                    data.push({name: 'chromosome', value: chr});
                    data.push({name: 'position', value: pos});
                    data.push({name: 'reference', value: refAllele});
                    data.push({name: 'alternate', value: altAllele});
                    data.push({name: 'ID', value: variantName});
                    if (track.posteriorProbability){
                        data.push({name: 'posterior probability', value: value});
                    } else {
                        data.push({name: 'pValue', value: value});
                    }


                } else {

                    // Here is the old way of doing things.  I'm not sure if anyone uses this approach anymore,
                    //  or if the code is strictly vestigial.  In any case I left it as is.

                    chr = p.feature.CHROM || p.feature.chr;   // TODO fixme
                    pos = p.feature.POS || p.feature.start;   // TODO fixme

                    dbSnp = p.feature.DBSNP_ID || p.feature["Strongest SNP-risk allele"];
                    beta = p.feature["Odds ratio or beta"];

                    if (dbSnp) {
                        url = this.variantURL.startsWith("http") ? this.variantURL : this.portalURL + "/" + this.variantURL;
                        data.push("<a target='_blank' href='" + url + (url.endsWith("/") ? "" : "/") + dbSnp + "' >" + dbSnp + "</a>");
                    }
                    data.push({name: 'position', value: pos+1});
                    data.push({name: 'p-value', value: value});
                    if (typeof beta === "number"){
                        data.push({name: 'effect', value: beta.toPrecision(3)});
                    }
                    if (p.feature.ZSCORE) {
                        data.push({name: 'z-score', value: p.feature.ZSCORE});
                    }
                    if (dbSnp) {
                        url = this.traitURL.startsWith("http") ? this.traitURL : this.portalURL + "/" + this.traitURL;
                        data.push("<a target='_blank' href='" + url + (url.endsWith("/") ? "" : "/") + dbSnp + "'>" +
                            "see all available statistics for this variant</a>");
                    }
                }



                if ((typeof track.config.rememberVariant === 'function')&&
                    (p.feature.varID)){
                    track.config.rememberVariant(p.feature.varID);
                }

            }
        }
    } else {
        data.push("Popover not available at this resolution.")
    }
    return data;
};


GWASTrack.prototype.menuItemList = function () {

    const dataRangeMenuItem = MenuUtils.dataRangeMenuItem;

    var self = this,
        menuItems = [];

    menuItems.push(dataRangeMenuItem(this.trackView));

    menuItems.push({
        object: createCheckbox("Autoscale", self.autoscale),
        click: function () {
            self.autoscale = !self.autoscale;
            self.config.autoscale = self.autoscale;
            self.trackView.setDataRange(undefined, undefined, self.autoscale);
        }
    });

    return menuItems;

};


GWASTrack.prototype.doAutoscale = function (featureList) {
    const track = this;

    if (featureList.length > 0) {

        // posterior probabilities are treated without modification, but we need to take a negative logarithm of P values
        const values = featureList.map(function (qtl) {
            if (track.posteriorProbability){
                return {value:qtl[track.ppa]};
            } else {
                return {value:-Math.log(qtl.pvalue || qtl[track.pvalue]) / Math.LN10};
            }

        });
        const range = doAutoscale(values);
        this.dataRange.max = range.max;
        this.dataRange.min = (range.min !== range.max)?range.min:0;

    } else {

        // No features -- pick something reasonable for PPAs and p-values
        if (track.posteriorProbability){
            this.dataRange.min = 0;
            this.dataRange.max = 1;
        } else {
            var max = this.config.maxLogP || this.config.max;
            this.dataRange.max = max || 25;
            var min = this.config.minLogP || this.config.min;
            this.dataRange.min = min || 0;
        }

    }

    return this.dataRange;
};


export default GWASTrack;

