
import FeatureSource from '../feature/featureSource.js';
import TrackBase from "../trackBase.js";
import IGVGraphics from "../igv-canvas.js";
import {createCheckbox} from "../igv-icons.js";
import {extend, isSimpleType} from "../util/igvUtils.js";
import IGVColor from "../igv-color.js";
import {numberFormatter} from "../util/stringUtils.js";
import paintAxis from "../util/paintAxis.js";

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

    let baselineColor;
    if (typeof self.color === "string" && self.color.startsWith("rgb(")) {
        baselineColor = IGVColor.addAlpha(self.color, 0.1);
    }

    const yScale = (yValue) => {
        return ( (self.dataRange.max - yValue) / (self.dataRange.max - self.dataRange.min) ) * pixelHeight
    };

    const getX = function (bpPosition) {
        let x = Math.floor((bpPosition - bpStart) / bpPerPixel);
        if (isNaN(x)) console.log('isNaN(x). feature start ' + numberFormatter(bpPosition) + ' bp start ' + numberFormatter(bpStart));
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

        // Max can be less than min if config.min is set but max left to autoscale.   If that's the case there is
        // nothing to paint.
        if (self.dataRange.max > self.dataRange.min) {

            if (renderFeature.end < bpStart) return;
            if (renderFeature.start > bpEnd) return;

            let previousValues = { end: 0, values: {} };
            for (let f of features) {
                renderFeature(previousValues, f);
            }

            // If the track includes negative values draw a baseline
            if (self.dataRange.min < 0) {
                const basepx = (self.dataRange.max / (self.dataRange.max - self.dataRange.min)) * options.pixelHeight;
                IGVGraphics.strokeLine(ctx, 0, basepx, options.pixelWidth, basepx, {strokeStyle: baselineColor});
            }
        }
    }

    drawGuideLines(options);

    function renderFeature(previousValues, feature) {
        const previousX = getX(previousValues.end)
        const x1 = getX(feature.start);
        const x2 = getX(feature.end);

        if (isNaN(x1) || isNaN(x2)) return;

        //let c = (feature.value < 0 && self.altColor) ? self.altColor : self.color;
        //const color = (typeof c === "function") ? c(feature.value) : c;

        //const height = yScale(0) - y;
        //const width = getWidth(feature, x);

        //const pointSize = self.config.pointSize || 3;
        for (let v of feature.values) {
            const sampleName = v[0];
            const value = v[1];
            const y = yScale(value);
            const previousValue = previousValues.values[sampleName]
            if (!isNaN(previousValue)) {
                IGVGraphics.dashedLine(ctx, previousX, yScale(previousValue), x1, y);
            }
            IGVGraphics.strokeLine(ctx, x1, y, x2, y);

            previousValues.values[sampleName] = value;

            //IGVGraphics.fillCircle(ctx, px, y, pointSize / 2, {"fillStyle": color, "strokeStyle": color});
            //IGVGraphics.fillRect(ctx, x, y, width, height, {fillStyle: color});
            //lastXPixel = x + width;
            //if (feature.value > 0) {
            //    lastValue = feature.value;
            //} else if (feature.value < 0) {
            //    lastNegValue = feature.value;
           //}
        }
        previousValues.end = feature.end;

    }

};


GCNVTrack.prototype.doAutoscale = function(features) {

    var min, max;

    if (features.length > 0) {
        min = Number.MAX_VALUE;
        max = -Number.MAX_VALUE;

        features.forEach(function (f) {
            f.values.forEach(function (value) {
                if (!Number.isNaN(value[1])) {
                    min = Math.min(min, value[1]);
                    max = Math.max(max, value[1]);
                }
            });
        });

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
    return this.featureSource.supportsWholeGenome();
}



export default GCNVTrack;
