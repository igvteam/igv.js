/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
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

var igv = (function (igv) {

    /**
     * @param config tableFormat configuration
     */
    igv.EncodeTableFormat = function (config) {
        var self = this,
            keys;

        this.config = config;

        keys = _.keys(config.columnWidths);

        this.indices = {};
        _.each(keys, function (key) {
            var a,
                b;

            a = key.split(' ');
            b = _.map(a, function (aa) {
                return aa.toLowerCase();
            });

            self.indices[ key ] = b.join('_');
        });

        this.fancyColumnFormat = _.map(keys, function (key) {
            return { index: self.indices[ key ], title: key, type:'string', width: config.columnWidths[ key ] };
        });

    };

    igv.EncodeTableFormat.prototype.fancyColumns = function () {
        return this.fancyColumnFormat;
    };

    igv.EncodeTableFormat.prototype.fancyData = function () {

        var result;

        result = _.map(jSON.rows, function (row, index) {

            var rr;

            rr = _.map(jSON.columns, function (key) {
                return row[key];
            });

            return rr;

        });

        return result;
    };

    /**
     * @param jSON data object passed from EncodeDataSource instance
     */
    igv.EncodeTableFormat.prototype.tableData = function (jSON) {

        var result;

        result = _.map(jSON.rows, function (row, index) {

            var rr;

            rr = _.map(jSON.columns, function (key) {
                return row[key];
            });

            return rr;

        });

        return result;
    };

    /**
     * @param jSON data object passed from EncodeDataSource instance
     */
    igv.EncodeTableFormat.prototype.tableColumns = function (jSON) {

        var self = this,
            columns;

        columns = _.map(jSON.columns, function (heading) {
            return {title: heading, width: self.config.columnWidths[heading]}
        });

        // columns.unshift({ title:'index', width:'10%' });

        return columns;

    };

    return igv;


})(igv || {});
