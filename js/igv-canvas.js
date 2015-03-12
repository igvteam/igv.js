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


// Define singleton collection of helper functions.  The "this" paramter in these functions is a canvas 2d context.
//
// Example usage
//
//    igv.Canvas.strokeLine.call(context, 0, 0, 10, 10);
//

var igv = (function (igv) {

    igv.Canvas = {


        setProperties: function (properties) {

            for (var key in properties) {
                if (properties.hasOwnProperty(key)) {
                    var value = properties[key];
                    this[key] = value;
                }
            }
        },

        strokeLine: function (x1, y1, x2, y2, properties) {

            x1 = Math.floor(x1) + 0.5;
            y1 = Math.floor(y1) + 0.5;
            x2 = Math.floor(x2) + 0.5;
            y2 = Math.floor(y2) + 0.5;

            this.save();
            if (properties) igv.Canvas.setProperties.call(this, properties);

            this.beginPath();
            this.moveTo(x1, y1);
            this.lineTo(x2, y2);
            this.stroke();
            this.restore();
        },

        fillRect: function (x, y, w, h, properties) {

            var c;
            x = Math.round(x);
            y = Math.round(y);

            if (properties) {
                this.save();
                igv.Canvas.setProperties.call(this, properties);
            }

            this.fillRect(x, y, w, h);

            if (properties) this.restore();
        },

        fillPolygon: function (x, y, properties) {

            var i, len = x.length;
            for (i = 0; i < len; i++) {
                x[i] = Math.round(x[i]);
                y[i] = Math.round(y[i]);
            }

            this.save();
            if (properties)   igv.Canvas.setProperties.call(this, properties);

            this.beginPath();
            this.moveTo(x[0], y[0]);
            for (i = 1; i < len; i++) {
                this.lineTo(x[i], y[i]);
            }
            this.closePath();
            this.fill();

            this.restore();
        },

        fillText: function (text, x, y, properties, transforms) {

            if (properties) {
                this.save();
                igv.Canvas.setProperties.call(this, properties);
            }


            this.save();

            this.translate(x, y);
            if (transforms) {

                for (var transform in transforms) {
                    var value = transforms[transform];

                    // TODO: Add error checking for robustness
                    if (transform == 'translate') {
                        this.translate(value['x'], value['y']);
                    }
                    if (transform == 'rotate') {
                        this.rotate(value['angle'] * Math.PI / 180);
                    }
                }

            }

            this.fillText(text, 0, 0);
            this.restore();

            if (properties) this.restore();

        },

        strokeText: function (text, x, y, properties, transforms) {

            if (properties) {
                //this.ctx.save();
                igv.Canvas.setProperties.call(this, properties);
            }

            this.save();

            this.translate(x, y);
            if (transforms) {

                for (var transform in transforms) {
                    var value = transforms[transform];

                    // TODO: Add error checking for robustness
                    if (transform == 'translate') {
                        this.translate(value['x'], value['y']);
                    }
                    if (transform == 'rotate') {
                        this.rotate(value['angle'] * Math.PI / 180);
                    }
                }
            }


            this.strokeText(text, 0, 0);
            this.restore();
            //this.ctx.strokeText(text, x, y);

            if (properties) {
                //this.ctx.restore();
            }
        },

        strokeCircle: function (x, y, radius) {

            this.beginPath();
            this.arc(x, y, radius, 0, 2 * Math.PI);
            this.stroke();
        },

        fillCircle: function (x, y, radius) {

            this.beginPath();
            this.arc(x, y, radius, 0, 2 * Math.PI);
            this.fill();
        }
    }


    return igv;
})(igv || {});


