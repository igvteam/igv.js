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

var igv = (function (igv) {

    var transformations;

    /**
     *
     * @constructor
     *
     */
    igv.SVG = function () {
        this.svg = '';
        this.contents = [];
        transformations = [];
    };


    /**
     * Set styling properties. Returns a string for the 'style' attribute.
     *
     * @param properties - object with SVG properties
     *
     * @returns {string}
     */
    igv.SVG.prototype.setProperties = function (properties) {

        var str = '';

        for (var key in properties) {
            if (properties.hasOwnProperty(key)) {
                var value = properties[key];

                if (key === 'font-family') {
                    str += 'font-family:' + value + ';';
                } else if (key === 'font-size') {
                    str += 'font-size:' + value + ';';
                } else if (key == 'fillStyle') {
                    str += 'fill:' + value + ';';
                } else if (key === 'fill') {
                    str += 'fill:' + value + ';';
                } else if (key == 'strokeStyle') {
                    str += 'stroke:' + value + ';';
                } else if (key === 'stroke') {
                    str += 'stroke:' + value + ';';
                } else if (key === 'stroke-width') {
                    str += 'stroke-width:' + value + ';';
                } else {
                    console.log('Unknown property: ' + key);
                }
            }
        }



        //if (str != '') {
        //    return str;
        //}

        // TODO: What should be done if there are no properties in the object?
        return str;

    };

    igv.SVG.prototype.setTransforms = function (transforms, x, y) {
        var str = '';

        for (var key in transforms) {
            if (transforms.hasOwnProperty(key)) {
                var value = transforms[key];

                if (key === 'rotate') {
                    str += 'rotate(' + value['angle'];

                    str += ',' + x;
                    str += ',' + y;

                    str += ')';

                } else if (key === 'translate') {
                    str += 'translate(' + value[x];
                    if ('y' in value) {
                        str += ',' + value['y'];
                    }

                    str += ')';
                } else {
                    console.log('Unknown transform: ' + key);
                }
            }

            str += ' ';
        }

        // TODO: What should be done if there are no transformations in the object?
        return str;
    };

    igv.SVG.prototype.clearRect = function (x, y, w, h) {

    }

    igv.SVG.prototype.strokeLine = function (x1, y1, x2, y2, properties, transforms) {
        var str = '';

        str += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +'"';

        if (properties) {
            str += ' style="' + this.setProperties(properties) + '"';
        }

        if (transforms) {
            str += ' transform="' + this.setTransforms(transforms, x1, y1) + '"';
        }

        str += '/>';

        this.contents.push(str);
    };

    /**
     *
     * @param x - x coordinate - upper left corner.
     * @param y - y coordinate - upper left corner.
     * @param w - width of the rectangle expanding rightwards.
     * @param h - height of the rectangle expanding downwards.
     * @param properties - style attribute for the SVG rectangle.
     */
    igv.SVG.prototype.fillRect = function (x, y, w, h, properties, transforms) {
        var str = '';

        str += '<rect ' + 'x="' + x + '" y="' + y;
        str += '" width="' + w + '" height="' + h + '"';

        if (properties) {
            str += ' style="' + this.setProperties(properties) + '"';
        }

        if (transforms) {
            str += ' transform="' + this.setTransforms(transforms, x, y) + '"';
        }

        str += '/>';

        this.contents.push(str);

    };

    /**
     *
     * @param centerX - x coordinate - center of rectangle.
     * @param centerY - y coordinate - center of rectangle.
     * @param width - width of the rectangle.
     * @param height - height of the rectangle.
     * @param properties - style attribute for the SVG rectangle.
     */
    igv.SVG.prototype.fillRectWithCenter = function (centerX, centerY, width, height, properties, transforms) {
        var str = '';

        str += '<rect ' + 'x="' + (centerX - (width / 2)) + '" y="' + (centerY - (height / 2));
        str += '" width="' + width + '" height="' + height + '"';

        if (properties) {
            str += ' style="' + this.setProperties(properties) + '"';
        }

        if (transforms) {
            str += ' transform="' + this.setTransforms(transforms, centerX, centerY) + '"';
        }

        str += '/>';


        this.contents.push(str);
    };


    /**
     *
     * @param x - array of "x" values
     * @param y - array of "y" values
     * @param properties
     * @param transforms
     */
    igv.SVG.prototype.fillPolygon = function (x, y, properties, transforms) {
        var str = '';

        str += '<polygon points="';

        for (var index = 0; index < x.length; index++) {
            str += ' ' + x[index] + ',' + y[index];
        }

        str += '"';

        if (properties) {
            str += ' style="' + this.setProperties(properties) + '"';
        }

        if (transforms) {
            str += ' transform="' + this.setTransforms(transforms, x, y) + '"';
        }

        str += '/>';

        this.contents.push(str);

    };

    /**
     * Generates text on the svg canvas.
     *
     * @param text
     * @param x - x coordinate for the SVG text.
     * @param y - y coordinate for the SVG text.
     * @param properties - style attribute for the SVG text.
     * @param transforms
     */
    igv.SVG.prototype.fillText = function (text, x, y, properties, transforms) {
        var str = '';

        str += '<text x="' + x + '" y="' + y + '"';

        if (properties) {
            str += ' style="' + this.setProperties(properties) + '"';
        }

        if (transforms) {
            str += ' transform="' + this.setTransforms(transforms, x, y) + '"';
        }

        str += '>';
        str += text;
        str += '</text>';

        this.contents.push(str);
    };

    /**
     * TODO: This is a duplicate of fillText as SVG has fill and
     * TODO: stroke values for text instead of separate types.
     *
     * Generates text on the svg canvas.
     *
     * @param text
     * @param x - x coordinate for the SVG text.
     * @param y - y coordinate for the SVG text.
     * @param properties - style attribute for the SVG text.
     * @param transforms
     */
    igv.SVG.prototype.strokeText = function (text, x, y, properties, transforms) {
        var str = '';

        str += '<text x="' + x + '" y="' + y + '"';
        if (properties) {
            str += ' style="' + this.setProperties(properties) + '"';
        }

        if (transforms) {
            str += ' transform="' + this.setTransforms(transforms, x, y) + '"';
        }

        str += '>';
        str += text;
        str += '</text>';

        this.contents.push(str);
    };

    igv.SVG.prototype.strokeCircle = function (x, y, radius, properties, transforms) {
        var str = '';

        str += '<circle cx="' + x + '" cy="' + y + '" r="' + radius + '" stroke="black" fill-opacity="0.0"/>';

        this.contents.push(str);
    };

    /**
     * Convers the SVG object into a string to put in html.
     *
     * @returns {string}
     */
    igv.SVG.prototype.string = function () {
        var string = '';

        string += '<svg width="100%" height="100%" version="1.1" xmlns="http://www.w3.org/2000/svg">';

        for (var index = 0; index < this.contents.length; index++) {
            string += '\n' + this.contents[index];
        }

        //string += '<text x="350" y="250" transform="rotate(60 350 250)">Hello!</text>';

        string += '</svg>';

        return string;
    };

    igv.SVG.prototype.innerString = function () {
        var string = '';

        for (var index = 0; index < this.contents.length; index++) {
            string += '\n' + this.contents[index];
        }

        //string += '<text x="350" y="250" transform="rotate(60 350 250)">Hello!</text>';


        return string;
    };


    //igv.SVG.prototype.rotate = function(angle, x, y) {
    //    transformations.push('rotate(' + angle + ',' + x + ',' + y +')');
    //};

    //igv.SVG.prototype.translate

    return igv;
})(igv || {});


