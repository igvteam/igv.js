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

import $ from "../vendor/jquery-3.3.1.slim.js";

const ChromosomeSelectWidget = function (browser, $parent) {

    this.showAllChromosomes = browser.config.showAllChromosomes !== false;   // i.e. default to true

    this.$container = $('<div>', { class: 'igv-chromosome-select-widget-container' });
    $parent.append(this.$container);

    this.$select = $('<select>', {'name': 'chromosome-select-widget'});
    this.$container.append(this.$select);

    this.$select.on('change', function () {
        const value = $(this).val();
        if (value !== '') {
            browser.search($(this).val());
            $(this).blur();
        }
    });

};

ChromosomeSelectWidget.prototype.update = function (genome) {


    this.$select.empty();
    const list = this.showAllChromosomes ? genome.chromosomeNames.slice() : genome.wgChromosomeNames.slice();  // slice used to copy list
    if(genome.showWholeGenomeView()) {
        list.unshift('all');
        list.unshift('');
    }
    for (let name of list) {
        var $o;
        $o = $('<option>', {'value': name});
        this.$select.append($o);
        $o.text(name);
    }

};

export default ChromosomeSelectWidget;

