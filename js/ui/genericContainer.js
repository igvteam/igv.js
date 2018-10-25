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

igv.genericContainer = function ({ $parent, closeHandler }) {

    var self = this,
        $header,
        $fa;

    this.namespace = '.generic_container_' + igv.guid();

    let $container = $('<div>', {class: 'igv-generic-container'});
    $parent.append($container);
    this.$container = $container;

    let bbox = $parent.get(0).getBoundingClientRect();
    this.origin = { x: bbox.x, y: bbox.y };
    this.$container.offset( { left: this.origin.x, top: this.origin.y } );

    // header
    $header = $('<div>');
    this.$container.append($header);

    // close button
    $fa = igv.createIcon("times");
    $header.append($fa);

    $fa.on('mousedown' + self.namespace, function (e) {
        e.stopPropagation();
    });

    $fa.on('mouseup' + self.namespace, function (e) {
        e.stopPropagation();
    });

    $fa.on('click' + self.namespace, function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeHandler(e);
    });

    $fa.on('touchend' + self.namespace, function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeHandler(e);
    });

    igv.makeDraggable(this.$container.get(0), $header.get(0));

};
