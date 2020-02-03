
import FeatureSource from '../feature/featureSource.js';
import TrackBase from "../trackBase.js";
import IGVGraphics from "../igv-canvas.js";
import {createCheckbox} from "../igv-icons.js";
import {extend, isSimpleType} from "../util/igvUtils.js";
import {numberFormatter} from "../util/stringUtils.js";
import paintAxis from "../util/paintAxis.js";
import MenuUtils from "../ui/menuUtils.js";

const X_PIXEL_DIFF_THRESHOLD = 1;
const dataRangeMenuItem = MenuUtils.dataRangeMenuItem;

const GCNVTrack = extend(TrackBase,

  function (config, browser) {
      TrackBase.call(this, config, browser);
      this.autoscale = config.autoscale || config.max === undefined;
      this.dataRange = {
          min: config.min || 0,
          max: config.max
      }

      this.windowFunction = config.windowFunction || "mean";
      this.paintAxis = paintAxis;
      this.graphType = config.graphType || "bar";

      this.featureSource = new FeatureSource(this.config, browser.genome);
  });


GCNVTrack.prototype.postInit = async function () {

    this.header = await this.featureSource.getFileHeader();
}

GCNVTrack.prototype.menuItemList = function () {
    const self = this;
    const menuItems = [];
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


GCNVTrack.prototype.getFeatures = function (chr, bpStart, bpEnd) {
    return this.featureSource.getFeatures(chr, bpStart, bpEnd);
};


GCNVTrack.prototype.draw = function (options) {
    let self = this;

    const features = options.features;
    const ctx = options.context;
    const bpPerPixel = options.bpPerPixel;
    const bpStart = options.bpStart;
    const pixelWidth = options.pixelWidth;
    const pixelHeight = options.pixelHeight;
    const bpEnd = bpStart + pixelWidth * bpPerPixel + 1;

    ///let baselineColor;
    //if (typeof self.color === "string" && self.color.startsWith("rgb(")) {
    //    baselineColor = IGVColor.addAlpha(self.color, 0.1);
    //}

    const yScale = (yValue) => {
        return ( (self.dataRange.max - yValue) / (self.dataRange.max - self.dataRange.min) ) * pixelHeight
    };

    const getX = function (bpPosition) {
        let x = Math.floor((bpPosition - bpStart) / bpPerPixel);
        if (isNaN(x)) console.warn('isNaN(x). feature start ' + numberFormatter(bpPosition) + ' bp start ' + numberFormatter(bpStart));
        return x;
    };

    const drawGuideLines = function (options) {
        if (self.config.hasOwnProperty('guideLines')) {
            for (let line of self.config.guideLines) {
                if (line.hasOwnProperty('color') && line.hasOwnProperty('y') && line.hasOwnProperty('dotted')) {
                    let y = yScale(line.y);
                    let props = {
                        'strokeStyle': line['color'],
                        'strokeWidth': 2
                    };
                    if (line['dotted']) IGVGraphics.dashedLine(options.context, 0, y, options.pixelWidth, y, 5, props);
                    else IGVGraphics.strokeLine(options.context, 0, y, options.pixelWidth, y, props);
                }
            }
        }
    };

    if (features && features.length > 0) {

        if (self.dataRange.min === undefined) self.dataRange.min = 0;

        // Max can be less than min if config.min is set but max left to autoscale. If that's the case there is
        // nothing to paint.
        if (self.dataRange.max > self.dataRange.min) {
            const highlightSamples = this.config.highlightSamples;

            let previousEnd = -1;
            let previousValues = {};

            let highlightConnectorLines = [];
            let highlightFeatureLines = [];
            for (let feature of features) {
                const x1 = getX(feature.start);
                const x2 = getX(feature.end);
                const previousX = previousEnd >= 0 ? getX(previousEnd) : x1;

                if (isNaN(x1) || isNaN(x2)) continue;
                if ((x1 - previousX < X_PIXEL_DIFF_THRESHOLD) && (x2 - x1 < X_PIXEL_DIFF_THRESHOLD)) continue;

                for (let i = 0; i < feature.values.length; i++) {
                    const sampleName = self.header[i];
                    const value = feature.values[i];
                    const y = yScale(value);
                    if (x1 - previousX >= X_PIXEL_DIFF_THRESHOLD) {
                        const previousValue = previousValues[sampleName]
                        const previousY = yScale(previousValue);
                        const highlightColor = highlightSamples && highlightSamples[sampleName];
                        if (highlightColor) {
                            highlightConnectorLines.push([previousX, previousY, x1, y, highlightColor])
                        } else {
                            IGVGraphics.strokeLine(ctx, previousX, previousY, x1, y, {strokeStyle: '#D9D9D9'});
                        }
                    }

                    if (x2 - x1 >= X_PIXEL_DIFF_THRESHOLD) {
                        const highlightColor = highlightSamples && highlightSamples[sampleName];
                        if (highlightColor) {
                            highlightFeatureLines.push([x1, y, x2, y, highlightColor])
                        } else {
                            IGVGraphics.strokeLine(ctx, x1, y, x2, y, {strokeStyle: 'gray'});
                        }
                    }

                    previousValues[sampleName] = value;

                    //IGVGraphics.fillCircle(ctx, px, y, pointSize / 2, {"fillStyle": color, "strokeStyle": color});
                    //IGVGraphics.fillRect(ctx, x, y, width, height, {fillStyle: color});
                }
                previousEnd = feature.end;
            }

            for (let f of highlightConnectorLines) {
                IGVGraphics.strokeLine(ctx, f[0], f[1], f[2], f[3], {strokeStyle: f[4], lineWidth: 1.3});
            }
            for (let f of highlightFeatureLines) {
                IGVGraphics.strokeLine(ctx, f[0], f[1], f[2], f[3], {strokeStyle: f[4], lineWidth: 2});
            }

            /*
            // If the track includes negative values draw a baseline
            if (self.dataRange.min < 0) {
                const basepx = (self.dataRange.max / (self.dataRange.max - self.dataRange.min)) * options.pixelHeight;
                IGVGraphics.strokeLine(ctx, 0, basepx, options.pixelWidth, basepx, {strokeStyle: baselineColor});
            }
            */
        }
    }

    drawGuideLines(options);
};


GCNVTrack.prototype.doAutoscale = function(features) {

    let min, max;
    if (features.length > 0) {
        min = Number.MAX_VALUE;
        max = -Number.MAX_VALUE;

        features.forEach(function(feature) {
            min = Math.min(min, ...feature.values);
            max = Math.max(max, ...feature.values);
        });

        min -= 0.01;
        max += 0.01;
    } else {
        // No features -- default
        min = 0;
        max = 100;
    }

    return {min: min, max: max};
}


GCNVTrack.prototype.clickedFeatures = function (clickState) {

    const allFeatures = TrackBase.prototype.clickedFeatures.call(this, clickState);
    return filterByRow(allFeatures, clickState.y);

    function filterByRow(features, y) {

        return features.filter(function (feature) {
            const rect = feature.pixelRect;
            return rect && y >= rect.y && y <= (rect.y + rect.h);
        });
    }
}

GCNVTrack.prototype.popupData = function (clickState, featureList) {

    const self = this;

    if (!featureList) featureList = this.clickedFeatures(clickState);

    const items = [];

    for (let f of featureList) {
    }
    featureList.forEach(function (f) {
        extractPopupData(f, items);

    });

    return items;

    function extractPopupData(feature, data) {

        const filteredProperties = new Set(['row', 'color', 'sampleKey', 'uniqueSampleKey', 'uniquePatientKey']);

        // hack for whole genome properties
        let f
        if (feature.hasOwnProperty('realChr')) {
            f = Object.assign({}, feature);
            f.chr = feature.realChr;
            f.start = feature.realStart;
            f.end = feature.realEnd;
            delete f.realChr;
            delete f.realStart;
            delete f.realEnd;
        } else {
            f = feature;
        }


        for (let property of Object.keys(f)) {

            if (!filteredProperties.has(property) && isSimpleType(f[property])) {
                data.push({name: property, value: f[property]});
            }
        }
    }
}

GCNVTrack.prototype.contextMenuItemList = function (clickState) {

    const self = this;
    const referenceFrame = clickState.viewport.genomicState.referenceFrame;
    const genomicLocation = clickState.genomicLocation;

    // Define a region 5 "pixels" wide in genomic coordinates
    const sortDirection = this.config.sort ?
      (this.config.sort.direction === "ASC" ? "DESC" : "ASC") :      // Toggle from previous sort
      "DESC";
    const bpWidth = referenceFrame.toBP(2.5);

    function sortHandler(sort) {
        self.sortSamples(sort.chr, sort.start, sort.end, sort.direction);
    }

    return [
        {
            label: 'Sort by value', click: function (e) {


                const sort = {
                    direction: sortDirection,
                    chr: referenceFrame.chrName,
                    start: genomicLocation - bpWidth,
                    end: genomicLocation + bpWidth

                };

                sortHandler(sort);

                self.config.sort = sort;

            }
        }];

};

GCNVTrack.prototype.getState = function () {

    let config = this.config;

    config.autoscale = this.autoscale;

    if (!this.autoscale && this.dataRange) {
        config.min = this.dataRange.min;
        config.max = this.dataRange.max;
    }

    return config;

}

GCNVTrack.prototype.supportsWholeGenome = function () {
    return false;
}



export default GCNVTrack;
