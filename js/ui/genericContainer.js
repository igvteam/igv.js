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

import $ from "../vendor/jquery-3.3.1.slim.js";
import makeDraggable from "./draggable.js";
import {createIcon} from "../igv-icons.js";
import {guid} from "../util/domUtils.js";

const GenericContainer = function ({$parent, width, height, closeHandler}) {

    var self = this,
        $header,
        $fa;

    this.namespace = '.generic_container_' + guid();

    let $container = $('<div>', {class: 'igv-generic-container'});
    $parent.append($container);
    this.$container = $container;

    if (width) {
        this.$container.width(width);
    }

    if (height) {
        this.$container.height(height);
    }

    let bbox = $parent.get(0).getBoundingClientRect();
    this.origin = {x: bbox.x, y: bbox.y};
    this.$container.offset({left: this.origin.x, top: this.origin.y});

    // header
    $header = $('<div>');
    this.$container.append($header);

    // close button
    let $div = $('<i>');
    $header.append($div);

    $div.append(createIcon("times"));

    $div.on('mousedown' + self.namespace, function (e) {
        e.stopPropagation();
    });

    $div.on('mouseup' + self.namespace, function (e) {
        e.stopPropagation();
    });

    $div.on('click' + self.namespace, function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeHandler(e);
    });

    $div.on('touchend' + self.namespace, function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeHandler(e);
    });

    makeDraggable(this.$container.get(0), $header.get(0));
}

export default GenericContainer;
