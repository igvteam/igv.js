/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of ctx software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and ctx permission notice shall be included in
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


// Collection of helper functions for canvas rendering.  The "ctx" paramter in these functions is a canvas 2d context.
//
// Example usage
//
//    igv.graphics.strokeLine(context, 0, 0, 10, 10);
//

var igv = (function (igv) {


    var debug = false;

    var log = function (msg) {
        if (debug) {
            var d = new Date();
            var time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
            if (typeof copy != "undefined") {
                copy(msg);
            }
            if (typeof console != "undefined") {
                console.log("igv-canvas: " + time + " " + msg);
            }

        }
    };


    igv.graphics = {


        setProperties: function (ctx, properties) {

            for (var key in properties) {
                if (properties.hasOwnProperty(key)) {
                    var value = properties[key];
                    ctx[key] = value;
                }
            }
        },

        strokeLine: function (ctx, x1, y1, x2, y2, properties) {

            x1 = Math.floor(x1) + 0.5;
            y1 = Math.floor(y1) + 0.5;
            x2 = Math.floor(x2) + 0.5;
            y2 = Math.floor(y2) + 0.5;

            log("stroke line, prop: " + properties);

            ctx.save();
            if (properties) igv.graphics.setProperties(ctx, properties);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.restore();
        },

        fillRect: function (ctx, x, y, w, h, properties) {

            var c;
            x = Math.round(x);
            y = Math.round(y);

            log("fillRect");
            if (properties) {
                ctx.save();
                igv.graphics.setProperties(ctx, properties);
            }

            ctx.fillRect(x, y, w, h);

            if (properties) ctx.restore();
        },

        fillPolygon: function (ctx, x, y, properties) {
            ctx.save();
            if (properties)   igv.graphics.setProperties(ctx, properties);
            doPath(ctx, x, y);
            ctx.fill();
            ctx.restore();
        },

        strokePolygon: function (ctx, x, y, properties) {
            ctx.save();
            if (properties)   igv.graphics.setProperties(ctx, properties);
            doPath(ctx, x, y);
            ctx.stroke();
            ctx.restore();
        },

        fillText: function (ctx, text, x, y, properties, transforms) {

            if (properties) {
                ctx.save();
                igv.graphics.setProperties(ctx, properties);
            }


            ctx.save();

            ctx.translate(x, y);
            if (transforms) {

                for (var transform in transforms) {
                    var value = transforms[transform];

                    // TODO: Add error checking for robustness
                    if (transform == 'translate') {
                        ctx.translate(value['x'], value['y']);
                    }
                    if (transform == 'rotate') {
                        ctx.rotate(value['angle'] * Math.PI / 180);
                    }
                }

            }

            ctx.fillText(text, 0, 0);
            ctx.restore();

            if (properties) ctx.restore();

        },

        strokeText: function (ctx, text, x, y, properties, transforms) {


            ctx.save();
            if (properties) {
                igv.graphics.setProperties(ctx, properties);
            }


            ctx.translate(x, y);
            if (transforms) {

                for (var transform in transforms) {
                    var value = transforms[transform];

                    // TODO: Add error checking for robustness
                    if (transform == 'translate') {
                        ctx.translate(value['x'], value['y']);
                    }
                    if (transform == 'rotate') {
                        ctx.rotate(value['angle'] * Math.PI / 180);
                    }
                }
            }


            ctx.strokeText(text, 0, 0);
            ctx.restore();

        },

        strokeCircle: function (ctx, x, y, radius) {

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.stroke();
        },

        fillCircle: function (ctx, x, y, radius) {

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fill();
        },

        drawArrowhead: function (ctx, x, y, size, lineWidth) {

            ctx.save();
            if (!size) {
                size = 5;
            }
            if (lineWidth) {
                ctx.lineWidth = lineWidth;
            }
            ctx.beginPath();
            ctx.moveTo(x, y - size / 2);
            ctx.lineTo(x, y + size / 2);
            ctx.lineTo(x + size, y);
            ctx.lineTo(x, y - size / 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        },

        dashedLine: function (ctx, x1, y1, x2, y2, dashLen, properties) {
            ctx.save();
            x1 = Math.round(x1);
            y1 = Math.round(y1);
            x2 = Math.round(x2);
            y2 = Math.round(y2);
            dashLen = Math.round(dashLen);
            log("dashedLine");
            if (properties) igv.graphics.setProperties(ctx, properties);

            if (dashLen == undefined) dashLen = 2;
            ctx.moveTo(x1, y1);

            var dX = x2 - x1;
            var dY = y2 - y1;
            var dashes = Math.floor(Math.sqrt(dX * dX + dY * dY) / dashLen);
            var dashX = dX / dashes;
            var dashY = dY / dashes;

            var q = 0;
            while (q++ < dashes) {
                x1 += dashX;
                y1 += dashY;
                ctx[q % 2 == 0 ? 'moveTo' : 'lineTo'](x1, y1);
            }
            ctx[q % 2 == 0 ? 'moveTo' : 'lineTo'](x2, y2);

            ctx.restore();
        },


    }

    function doPath(ctx, x, y) {


        var i, len = x.length;
        for (i = 0; i < len; i++) {
            x[i] = Math.round(x[i]);
            y[i] = Math.round(y[i]);
        }

        ctx.beginPath();
        ctx.moveTo(x[0], y[0]);
        for (i = 1; i < len; i++) {
            ctx.lineTo(x[i], y[i]);
        }
        ctx.closePath();
    }

    return igv;
})(igv || {});


