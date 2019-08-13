/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2018 The Regents of the University of California
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

/**
 * Make the target element movable by clicking and dragging on the handle.  This is not a general purprose function,
 * it makes several options specific to igv dialogs, the primary one being that the
 * target is absolutely positioned in pixel coordinates

 */
const namespace = ".igv_drag";

let dragData;   // Its assumed we are only dragging one element at a time.

function makeDraggable(target, handle) {

    $(handle).on('mousedown' + namespace, dragStart.bind(target));

};


function dragStart(event) {

    event.stopPropagation();
    event.preventDefault();

    const styleX = Math.round(parseFloat(this.style.left.replace("px", "")));
    const styleY = Math.round(parseFloat(this.style.top.replace("px", "")));
    const dragFunction = drag.bind(this);
    const dragEndFunction = dragEnd.bind(this);

    dragData =
        {
            dragFunction: dragFunction,
            dragEndFunction: dragEndFunction,
            dx: styleX - event.screenX,
            dy: styleY - event.screenY
        };

    $(document).on('mousemove' + namespace, dragFunction);
    $(document).on('mouseup' + namespace, dragEndFunction);
    $(document).on('mouseleave' + namespace, dragEndFunction);
    $(document).on('mouseexit' + namespace, dragEndFunction);

}

function drag(event) {

    if (!dragData) {
        console.log("No drag data!");
        return;
    }

    event.stopPropagation();
    event.preventDefault();

    const styleX = dragData.dx + event.screenX;
    const styleY = dragData.dy + event.screenY;

    this.style.left = styleX + "px";
    this.style.top = styleY + "px";

    // console.log('drag ' + 'x ' + styleX + ' y ' + styleY);
}

function dragEnd(event) {

    if (!dragData) {
        console.log("No drag data!");
        return;
    }


    event.stopPropagation();
    event.preventDefault();

    const styleX = dragData.dx + event.screenX;
    const styleY = dragData.dy + event.screenY;

    // console.log('drag end ' + 'x ' + styleX + ' y ' + styleY);

    this.style.left = styleX + "px";
    this.style.top = styleY + "px";

    $(document).off(namespace);
    dragData = undefined;
}

export default makeDraggable;