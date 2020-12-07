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

import $ from "./vendor/jquery-3.3.1.slim.js";
import {DOMUtils} from '../node_modules/igv-utils/src/index.js';

class ViewportBase {

    constructor(trackView, $viewportContainer, referenceFrame, width) {

        this.guid = DOMUtils.guid();
        this.trackView = trackView;
        this.referenceFrame = referenceFrame;

        this.browser = trackView.browser;

        this.$viewport = $('<div class="igv-viewport">');
        $viewportContainer.append(this.$viewport);

        // store the viewport GUID for later use
        this.$viewport.data('viewportGUID', this.guid);

        this.$content = $("<div>", {class: 'igv-viewport-content'});
        this.$viewport.append(this.$content);

        this.$content.height(this.$viewport.height());
        this.contentDiv = this.$content.get(0);

        this.$canvas = $('<canvas class ="igv-canvas">');
        this.$content.append(this.$canvas);

        this.canvas = this.$canvas.get(0);
        this.ctx = this.canvas.getContext("2d");

        this.setWidth(width);

        this.initializationHelper()

    }

    initializationHelper() {

    }

    showMessage(message) {
        if (!this.messageDiv) {
            this.messageDiv = document.createElement('div');
            this.messageDiv.className = 'igv-viewport-message';
            this.contentDiv.append(this.messageDiv)
        }
        this.messageDiv.textContent = message;
        this.messageDiv.style.display = 'inline-block'
    }

    hideMessage(message) {
        if (this.messageDiv)
            this.messageDiv.style.display = 'none'
    }

    setTrackLabel(label) {}

    startSpinner() {}

    stopSpinner(){}

    checkZoomIn() {
        return true
    }

    shift() {}

    setTop(contentTop) {}

    async loadFeatures () {
        return undefined
    }

    setContentHeight(contentHeight) {
    }

    isLoading() {
        return false
    }

    saveSVG() {

    }

    async renderSVGContext(context, offset) {
        console.log('ViewportBase - renderSVGContext(context, offset)')
    }

    drawSVGWithContect(context) {
        console.log('ViewportBase - drawSVGWithContect(context)')
    }

    isVisible() {
        return this.$viewport.width()
    }

    setWidth(width) {
        this.$viewport.width(width);
        this.canvas.style.width = (`${ width }px`);
        this.canvas.setAttribute('width', width);
    }

    getWidth() {
        return this.$viewport.width();
    }

    getContentHeight() {
        return this.$content.height();
    }

    getContentTop() {
        return this.contentDiv.offsetTop;
    }

    containsPosition(chr, position) {
        console.log('ViewportBase - containsPosition(chr, position)')
    }

    /**
     * Called when the associated track is removed.  Do any needed cleanup here.
     */
    dispose() {

        if (this.popover) {
            this.popover.dispose()
        }

        this.$canvas.off();
        this.$canvas.empty();

        this.$content.off();
        this.$content.empty();

        this.$viewport.off();
        this.$viewport.empty();

        // Null out all properties -- this should not be neccessary, but just in case there is a
        // reference to self somewhere we want to free memory.
        for (let key of Object.keys(this)) {
            this[ key ] = undefined
        }
    }

}

export default ViewportBase
