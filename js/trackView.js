/*
 * The MIT License (MIT)
 *
 * ...
 */

import { doAutoscale } from "./util/igvUtils.js";
import { createViewport } from "./util/viewportUtils.js";
import { FeatureUtils, IGVColor, StringUtils } from '../node_modules/igv-utils/src/index.js';
import * as DOMUtils from "./ui/utils/dom-utils.js";
import { createIcon } from "./ui/utils/icons.js";
import SampleInfoViewport from "./sample/sampleInfoViewport.js";
import SampleNameViewport from './sample/sampleNameViewport.js';
import MenuPopup from "./ui/menuPopup.js";
import { autoScaleGroupColorHash, multiTrackSelectExclusionTypes } from "./ui/menuUtils.js";
import { colorPalettes, hexToRGB } from "./util/colorPalletes.js";
import { isOverlayTrackCriteriaMet } from "./ui/overlayTrackButton.js";

const igv_axis_column_width = 50;
const scrollbarExclusionTypes = new Set(['sequence', 'ruler', 'ideogram']);
const colorPickerExclusionTypes = new Set(['ruler', 'sequence', 'ideogram']);

class TrackView {

    constructor(browser, columnContainer, track) {
        this.namespace = `trackview-${DOMUtils.guid()}`;
        this.browser = browser;
        this.track = track;
        track.trackView = this;

        this.addDOMToColumnContainer(browser, columnContainer, browser.referenceFrameList);
    }

    startSpinner() {
        if (this.viewports && this.viewports.length > 0) {
            this.viewports[0].startSpinner();
        }
    }

    stopSpinner() {
        if (this.viewports && this.viewports.length > 0) {
            this.viewports[0].stopSpinner();
        }
    }

    addDOMToColumnContainer(browser, columnContainer, referenceFrameList) {
        // Axis
        this.axis = this.createAxis(browser, this.track);

        this.createViewports(browser, columnContainer, referenceFrameList);

        // Sample Info
        this.sampleInfoViewport = new SampleInfoViewport(this, browser.columnContainer.querySelector('.igv-sample-info-column'), browser.getSampleInfoViewportWidth());

        // SampleName Viewport
        this.sampleNameViewport = new SampleNameViewport(this, browser.columnContainer.querySelector('.igv-sample-name-column'), undefined, browser.getSampleNameViewportWidth());

        // Track Scrollbar
        this.createTrackScrollbar(browser);

        // Track Drag
        this.createTrackDragHandle(browser);

        // Track Gear
        this.createTrackGearPopup(browser);
    }

    createViewports(browser, columnContainer, referenceFrameList) {
        this.viewports = [];
        const viewportWidth = browser.calculateViewportWidth(referenceFrameList.length);
        const viewportColumns = columnContainer.querySelectorAll('.igv-column');
        for (let i = 0; i < viewportColumns.length; i++) {
            const viewport = createViewport(this, viewportColumns[i], referenceFrameList[i], viewportWidth);
            this.viewports.push(viewport);
        }
    }

    createAxis(browser, track) {
        const axis = DOMUtils.div();
        browser.columnContainer.querySelector('.igv-axis-column').appendChild(axis);

        axis.dataset.tracktype = track.type;
        axis.style.height = `${track.height}px`;

        if (typeof track.paintAxis === 'function') {
            const { width, height } = axis.getBoundingClientRect();
            this.axisCanvas = document.createElement('canvas');
            this.axisCanvas.style.width = `${width}px`;
            this.axisCanvas.style.height = `${height}px`;
            axis.appendChild(this.axisCanvas);
        }

        if (!multiTrackSelectExclusionTypes.has(this.track.type)) {
            const trackSelectionContainer = DOMUtils.div();
            axis.appendChild(trackSelectionContainer);

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.name = 'track-select';
            trackSelectionContainer.appendChild(input);
            input.checked = this.track.selected || false;

            input.addEventListener('change', event => {
                event.preventDefault();
                event.stopPropagation();
                this.track.selected = event.target.checked;
                this.setDragHandleSelectionState(event.target.checked);
                this.browser.overlayTrackButton.setVisibility(isOverlayTrackCriteriaMet(this.browser));
            });

            this.setTrackSelectionState(axis, false);
        }

        return axis;
    }

    resizeAxisCanvas(width, height) {
        this.axis.style.width = `${width}px`;
        this.axis.style.height = `${height}px`;

        if (typeof this.track.paintAxis === 'function') {
            this.axisCanvas.style.width = `${width}px`;
            this.axisCanvas.style.height = `${height}px`;
        }
    }

    renderSVGContext(context, { deltaX, deltaY }) {
        renderSVGAxis(context, this.track, this.axisCanvas, deltaX, deltaY);

        const { width: axisWidth } = this.axis.getBoundingClientRect();
        const { y } = this.viewports[0].viewportElement.getBoundingClientRect();

        let delta = {
            deltaX: axisWidth + deltaX,
            deltaY: y + deltaY
        };

        for (let viewport of this.viewports) {
            viewport.renderSVGContext(context, delta);
            const { width } = viewport.viewportElement.getBoundingClientRect();
            delta.deltaX += width;
        }

        if (this.browser.sampleInfo.isInitialized() && this.browser.sampleInfoControl.showSampleInfo) {
            this.sampleInfoViewport.renderSVGContext(context, delta);
            const { width } = this.sampleInfoViewport.viewport.getBoundingClientRect();
            delta.deltaX += width;
        }

        if (this.browser.showSampleNames) {
            this.sampleNameViewport.renderSVGContext(context, delta);
        }
    }

    presentColorPicker(key) {
        if (!colorPickerExclusionTypes.has(this.track.type)) {
            const trackColors = [];
            const color = this.track.color || this.track.defaultColor;
            if (StringUtils.isString(color)) {
                trackColors.push(color);
            }
            if (this.track.altColor && StringUtils.isString(this.track.altColor)) {
                trackColors.push(this.track.altColor);
            }
            let defaultColors = trackColors.map(c => c.startsWith("#") ? c : c.startsWith("rgb(") ? IGVColor.rgbToHex(c) : IGVColor.colorNameToHex(c));
            let colorHandlers = {
                color: hex => {
                    this.track.color = hexToRGB(hex);
                    this.repaintViews();
                },
                altColor: hex => {
                    this.track.altColor = hexToRGB(hex);
                    this.repaintViews();
                }
            };

            const selected = this.browser.getSelectedTrackViews();

            if (selected.length > 0 && new Set(selected).has(this)) {
                colorHandlers = {
                    color: rgbString => {
                        for (let trackView of selected) {
                            trackView.track.color = rgbString;
                            trackView.repaintViews();
                        }
                    }
                };

                this.browser.genericColorPicker.configure(defaultColors, colorHandlers);
            } else {
                this.browser.genericColorPicker.configure(defaultColors, colorHandlers);
            }

            this.browser.genericColorPicker.setActiveColorHandler(key);
            this.browser.genericColorPicker.show();
        }
    }

    setTrackHeight(newHeight, force) {
        if (!force) {
            if (this.track.minHeight) {
                newHeight = Math.max(this.track.minHeight, newHeight);
            }
            if (this.track.maxHeight) {
                newHeight = Math.min(this.track.maxHeight, newHeight);
            }
        }

        this.track.height = newHeight;
        this.resizeAxisCanvas(this.axis.clientWidth, this.track.height);

        if (typeof this.track.paintAxis === 'function') {
            this.paintAxis();
        }

        for (let { viewportElement } of this.viewports) {
            viewportElement.style.height = `${newHeight}px`;
        }

        this.sampleInfoViewport.setHeight(newHeight);
        this.sampleNameViewport.viewport.style.height = `${newHeight}px`;

        if (typeof this.track.computePixelHeight !== "function") {
            for (let vp of this.viewports) {
                vp.setContentHeight(newHeight);
            }
        }

        this.repaintViews();
        this.updateScrollbar();

        this.dragHandle.style.height = `${newHeight}px`;
        this.gearContainer.style.height = `${newHeight}px`;
    }

    updateScrollbar() {
        const viewportHeight = this.viewports[0].viewportElement.clientHeight;
        this.outerScroll.style.height = `${viewportHeight}px`;

        if (!scrollbarExclusionTypes.has(this.track.type)) {
            const viewportContentHeight = this.maxViewportContentHeight();
            const innerScrollHeight = Math.round((viewportHeight / viewportContentHeight) * viewportHeight);

            if (viewportContentHeight > viewportHeight) {
                this.innerScroll.style.display = 'block';
                this.innerScroll.style.height = `${innerScrollHeight}px`;
            } else {
                this.innerScroll.style.display = 'none';
            }
        }
    }

    moveScroller(delta) {
        const y = parseInt(this.innerScroll.style.top || 0, 10) + delta;
        const top = Math.min(Math.max(0, y), this.outerScroll.clientHeight - this.innerScroll.clientHeight);
        this.innerScroll.style.top = `${top}px`;

        const contentHeight = this.maxViewportContentHeight();
        const contentTop = -Math.round(top * (contentHeight / this.viewports[0].viewportElement.clientHeight));

        for (let viewport of this.viewports) {
            viewport.setTop(contentTop);
        }

        this.sampleInfoViewport.setTop(contentTop);
        this.sampleNameViewport.trackScrollDelta = delta;
        this.sampleNameViewport.setTop(contentTop);
    }

    isLoading() {
        for (let viewport of this.viewports) {
            if (viewport.isLoading()) return true;
        }
    }

    repaintViews() {
        for (let viewport of this.viewports) {
            if (viewport.isVisible()) {
                viewport.repaint();
            }
        }

        if (typeof this.track.paintAxis === 'function') {
            this.paintAxis();
        }

        this.repaintSampleInfo();
        this.repaintSamples();
    }

    repaintSampleInfo() {
        this.sampleInfoViewport.repaint();
    }

    repaintSamples() {
        if (typeof this.track.getSamples === 'function') {
            const samples = this.track.getSamples();
            if (samples.names && samples.names.length > 0) {
                this.sampleNameViewport.repaint(samples);
            }
        }
    }

    setTrackLabelName(name) {
        this.viewports.forEach(viewport => viewport.setTrackLabel(name));
    }

    resize(viewportWidth) {
        for (let viewport of this.viewports) {
            viewport.setWidth(viewportWidth);
        }
    }

    async updateViews() {
        if (!(this.browser && this.browser.referenceFrameList)) return;

        const visibleViewports = this.viewports.filter(viewport => viewport.isVisible());
        visibleViewports.forEach(viewport => viewport.shift());

        if (this.browser.dragObject) {
            return;
        }

        const viewportsToRepaint = visibleViewports.filter(vp => vp.needsRepaint()).filter(viewport => viewport.checkZoomIn());
        const viewportsToReload = viewportsToRepaint.filter(viewport => viewport.needsReload());

        for (let viewport of viewportsToReload) {
            await viewport.loadFeatures();
        }

        if (this.disposed) return;

        if (this.track && typeof this.track.variantRowCount === 'function' && viewportsToReload.length > 0) {
            let maxRow = 0;
            for (let viewport of this.viewports) {
                if (viewport.featureCache && viewport.featureCache.features) {
                    maxRow = Math.max(maxRow, viewport.featureCache.features.reduce((a, f) => Math.max(a, f.row || 0), 0));
                }
            }
            const current = this.track.nVariantRows;
            if (current !== maxRow + 1) {
                this.track.variantRowCount(maxRow + 1);
                for (let viewport of this.viewports) {
                    viewport.checkContentHeight();
                }
            }
        }

        let mergeAutocale;
        if (this.track.type === "merged") {
            mergeAutocale = this.track.updateScales(visibleViewports);
        } else if (this.track.autoscale) {
            let allFeatures = [];
            for (let visibleViewport of visibleViewports) {
                const referenceFrame = visibleViewport.referenceFrame;
                const start = referenceFrame.start;
                const end = start + referenceFrame.toBP(visibleViewport.getWidth());

                if (visibleViewport.featureCache && visibleViewport.featureCache.features) {
                    if (typeof visibleViewport.featureCache.features.getMax === 'function') {
                        const max = visibleViewport.featureCache.features.getMax(start, end);
                        allFeatures.push({ value: max });

                        if (typeof visibleViewport.featureCache.features.getMin === 'function') {
                            const min = visibleViewport.featureCache.features.getMin(start, end);
                            allFeatures.push({ value: min });
                        }
                    } else {
                        const viewFeatures = FeatureUtils.findOverlapping(visibleViewport.featureCache.features, start, end);
                        for (let f of viewFeatures) {
                            allFeatures.push(f);
                        }
                    }
                }
            }

            if (typeof this.track.doAutoscale === 'function') {
                this.track.dataRange = this.track.doAutoscale(allFeatures);
            } else {
                this.track.dataRange = doAutoscale(allFeatures);
            }
        }

        const refreshView = this.track.autoscale || this.track.autoscaleGroup || this.track.type === 'ruler' || mergeAutocale || this.track.groupBy;
        for (let vp of visibleViewports) {
            if (viewportsToRepaint.includes(vp)) {
                vp.repaint();
            } else if (refreshView) {
                vp.refresh();
            }
        }

        this.adjustTrackHeight();
        this.repaintSampleInfo();
        this.repaintSamples();
        this.updateRulerViewportLabels();
    }

    clearCachedFeatures() {
        for (let viewport of this.viewports) {
            viewport.clearCache();
        }
    }

    updateRulerViewportLabels() {
        const viewportWidth = this.browser.calculateViewportWidth(this.viewports.length);

        for (let viewport of this.viewports) {
            if (this.track.type === 'ruler') {
                if (this.viewports.length > 1) {
                    viewport.presentLocusLabel(viewportWidth);
                } else {
                    viewport.dismissLocusLabel();
                }
            }
        }
    }

    async getInViewFeatures() {
        if (!(this.browser && this.browser.referenceFrameList)) {
            return [];
        }

        let allFeatures = [];
        const visibleViewports = this.viewports.filter(viewport => viewport.isVisible());
        for (let vp of visibleViewports) {
            const referenceFrame = vp.referenceFrame;
            const { chr, start, bpPerPixel } = vp.referenceFrame;
            const end = start + referenceFrame.toBP(vp.getWidth());
            const needsReload = !vp.featureCache || !vp.featureCache.containsRange(chr, start, end, bpPerPixel);

            if (needsReload) {
                await vp.loadFeatures();
            }
            if (vp.featureCache && vp.featureCache.features) {
                if (typeof vp.featureCache.features.getMax === 'function') {
                    const max = vp.featureCache.features.getMax(start, end);
                    allFeatures.push({ value: max });
                } else {
                    const vpFeatures = typeof vp.featureCache.queryFeatures === 'function'
                        ? vp.featureCache.queryFeatures(chr, start, end)
                        : FeatureUtils.findOverlapping(vp.featureCache.features, start, end);
                    allFeatures = allFeatures.concat(vpFeatures);
                }
            }
        }
        return allFeatures;
    }

    checkContentHeight() {
        for (let viewport of this.viewports) {
            viewport.checkContentHeight();
        }
        this.adjustTrackHeight();
    }

    adjustTrackHeight() {
        var contentHeight = this.maxViewportContentHeight();
        if (this.track.autoHeight) {
            this.setTrackHeight(contentHeight, false);
        } else if (this.track.paintAxis) {
            this.paintAxis();
        }

        if (!scrollbarExclusionTypes.has(this.track.type)) {
            const currentTop = this.viewports[0].getContentTop();
            const viewportHeight = this.viewports[0].viewportElement.clientHeight;
            const minTop = Math.min(0, viewportHeight - contentHeight);
            if (currentTop < minTop) {
                for (let viewport of this.viewports) {
                    viewport.setTop(minTop);
                }
            }
            this.updateScrollbar();
        }
    }

    viewportsToReload(force) {
        const viewports = this.viewports.filter(viewport => {
            if (!viewport.isVisible()) {
                return false;
            }
            if (!viewport.checkZoomIn()) {
                return false;
            } else {
                const referenceFrame = viewport.referenceFrame;
                const chr = viewport.referenceFrame.chr;
                const start = referenceFrame.start;
                const end = start + referenceFrame.toBP(viewport.contentDiv.clientWidth);
                const bpPerPixel = referenceFrame.bpPerPixel;
                return force || (!viewport.tile || viewport.tile.invalidate || !viewport.tile.containsRange(chr, start, end, bpPerPixel));
            }
        });
        return viewports;
    }

    createTrackScrollbar(browser) {
        const outerScroll = DOMUtils.div();
        browser.columnContainer.querySelector('.igv-scrollbar-column').appendChild(outerScroll);
        outerScroll.style.height = `${this.track.height}px`;
        this.outerScroll = outerScroll;

        if (!scrollbarExclusionTypes.has(this.track.type)) {
            const innerScroll = DOMUtils.div();
            outerScroll.appendChild(innerScroll);
            this.innerScroll = innerScroll;

            this.addTrackScrollMouseHandlers(browser);
        }
    }

    createTrackDragHandle(browser) {
        if (this.track.type !== 'sequence' && multiTrackSelectExclusionTypes.has(this.track.type)) {
            this.dragHandle = DOMUtils.div({ class: 'igv-track-drag-shim' });
        } else {
            this.dragHandle = DOMUtils.div({ class: 'igv-track-drag-handle' });
            this.dragHandle.classList.add('igv-track-drag-handle-color');
        }

        browser.columnContainer.querySelector('.igv-track-drag-column').appendChild(this.dragHandle);
        this.dragHandle.style.height = `${this.track.height}px`;
        this.addTrackDragMouseHandlers(browser);
    }

    createTrackGearPopup(browser) {
        this.gearContainer = DOMUtils.div();
        browser.columnContainer.querySelector('.igv-gear-menu-column').appendChild(this.gearContainer);
        this.gearContainer.style.height = `${this.track.height}px`;

        if (!this.track.ignoreTrackMenu) {
            this.gear = DOMUtils.div();
            this.gearContainer.appendChild(this.gear);
            this.gear.appendChild(createIcon('cog'));

            this.trackGearPopup = new MenuPopup(this.gear);

            this.boundTrackGearClickHandler = trackGearClickHandler.bind(this);
            this.gear.addEventListener('click', this.boundTrackGearClickHandler);

            function trackGearClickHandler(event) {
                event.preventDefault();
                event.stopPropagation();

                if (this.trackGearPopup.popover.style.display === 'none') {
                    for (const otherTrackView of browser.trackViews.filter(t => t !== this && t.trackGearPopup)) {
                        otherTrackView.trackGearPopup.popover.style.display = 'none';
                    }

                    this.trackGearPopup.presentMenuList(this, browser.menuUtils.trackMenuItemList(this));
                } else {
                    this.trackGearPopup.popover.style.display = 'none';
                }
            }
        }
    }

    addTrackScrollMouseHandlers(browser) {
        this.boundTrackScrollMouseDownHandler = trackScrollMouseDownHandler.bind(this);
        this.innerScroll.addEventListener('mousedown', this.boundTrackScrollMouseDownHandler);

        function trackScrollMouseDownHandler(event) {
            event.stopPropagation();

            const y = DOMUtils.pageCoordinates(event).y;
            this.innerScroll.dataset.yDown = y.toString();

            this.boundColumnContainerMouseMoveHandler = columnContainerMouseMoveHandler.bind(this);
            browser.columnContainer.addEventListener('mousemove', this.boundColumnContainerMouseMoveHandler);

            function columnContainerMouseMoveHandler(event) {
                event.stopPropagation();

                const y = DOMUtils.pageCoordinates(event).y;
                this.moveScroller(y - parseInt(this.innerScroll.dataset.yDown, 10));
                this.innerScroll.dataset.yDown = y.toString();
            }
        }

        this.boundColumnContainerMouseUpHandler = columnContainerMouseUpHandler.bind(this);
        browser.columnContainer.addEventListener('mouseup', this.boundColumnContainerMouseUpHandler);
        browser.columnContainer.addEventListener('mouseleave', this.boundColumnContainerMouseUpHandler);

        function columnContainerMouseUpHandler(event) {
            browser.columnContainer.removeEventListener('mousemove', this.boundColumnContainerMouseMoveHandler);
        }
    }

    removeTrackScrollMouseHandlers() {
        if (!scrollbarExclusionTypes.has(this.track.type)) {
            this.innerScroll.removeEventListener('mousedown', this.boundTrackScrollMouseDownHandler);
            this.browser.columnContainer.removeEventListener('mouseup', this.boundColumnContainerMouseUpHandler);
            this.browser.columnContainer.removeEventListener('mousemove', this.boundColumnContainerMouseMoveHandler);
            this.browser.columnContainer.removeEventListener('mouseleave', this.boundColumnContainerMouseMoveHandler);
        }
    }

    addTrackDragMouseHandlers(browser) {
        if (this.track.type === 'sequence' || !multiTrackSelectExclusionTypes.has(this.track.type)) {
            let currentDragHandle = undefined;

            this.boundTrackDragMouseDownHandler = trackDragMouseDownHandler.bind(this);
            this.dragHandle.addEventListener('mousedown', this.boundTrackDragMouseDownHandler);

            function trackDragMouseDownHandler(event) {
                event.preventDefault();

                currentDragHandle = event.target;
                if (!this.track.selected) {
                    currentDragHandle.classList.remove('igv-track-drag-handle-color');
                    currentDragHandle.classList.add('igv-track-drag-handle-hover-color');
                }

                browser.startTrackDrag(this);
            }

            this.boundDocumentTrackDragMouseUpHandler = documentTrackDragMouseUpHandler.bind(this);
            document.addEventListener('mouseup', this.boundDocumentTrackDragMouseUpHandler);

            function documentTrackDragMouseUpHandler(event) {
                browser.endTrackDrag();

                if (currentDragHandle && event.target !== currentDragHandle) {
                    if (!this.track.selected) {
                        currentDragHandle.classList.remove('igv-track-drag-handle-hover-color');
                        currentDragHandle.classList.add('igv-track-drag-handle-color');
                    }
                }

                currentDragHandle = undefined;
            }

            this.boundTrackDragMouseEnterHandler = trackDragMouseEnterHandler.bind(this);
            this.dragHandle.addEventListener('mouseenter', this.boundTrackDragMouseEnterHandler);

            function trackDragMouseEnterHandler(event) {
                event.preventDefault();

                if (!currentDragHandle) {
                    if (!this.track.selected) {
                        event.target.classList.remove('igv-track-drag-handle-color');
                        event.target.classList.add('igv-track-drag-handle-hover-color');
                    }
                }

                browser.updateTrackDrag(this);
            }

            this.dragHandle.addEventListener('mouseout', event => {
                event.preventDefault();

                if (!currentDragHandle) {
                    if (!this.track.selected) {
                        event.target.classList.remove('igv-track-drag-handle-hover-color');
                        event.target.classList.add('igv-track-drag-handle-color');
                    }
                }
            });

            this.boundTrackDragMouseOutHandler = trackDragMouseOutHandler.bind(this);
            this.dragHandle.addEventListener('mouseout', this.boundTrackDragMouseOutHandler);

            function trackDragMouseOutHandler(event) {
                event.preventDefault();

                if (!currentDragHandle) {
                    if (!this.track.selected) {
                        event.target.classList.remove('igv-track-drag-handle-hover-color');
                        event.target.classList.add('igv-track-drag-handle-color');
                    }
                }
            }
        }
    }

    removeTrackDragMouseHandlers() {
        if (this.track.type === 'ideogram' || this.track.type === 'ruler') {
            return;
        }
        this.dragHandle.removeEventListener('mousedown', this.boundTrackDragMouseDownHandler);
        document.removeEventListener('mouseup', this.boundDocumentTrackDragMouseUpHandler);
        this.dragHandle.removeEventListener('mouseup', this.boundTrackDragMouseEnterHandler);
        this.dragHandle.removeEventListener('mouseout', this.boundTrackDragMouseOutHandler);
    }

    removeTrackGearMouseHandlers() {
        if (!this.track.ignoreTrackMenu) {
            this.gear.removeEventListener('click', this.boundTrackGearClickHandler);
        }
    }

    removeDOMFromColumnContainer() {
        // Axis
        this.axis.remove();
        this.removeViewportsFromColumnContainer();

        // Sample Info Viewport
        this.sampleInfoViewport.dispose();

        // SampleName Viewport
        this.sampleNameViewport.dispose();

        // empty trackScrollbar Column
        this.removeTrackScrollMouseHandlers();
        this.outerScroll.remove();

        // empty trackDrag Column
        this.removeTrackDragMouseHandlers();
        this.dragHandle.remove();

        // empty trackGear Column
        this.removeTrackGearMouseHandlers();
        this.gearContainer.remove();
    }

    removeViewportsFromColumnContainer() {
        for (let viewport of this.viewports) {
            viewport.viewportElement.remove();
        }
    }

    dispose() {
        this.axis.remove();

        for (let viewport of this.viewports) {
            viewport.dispose();
        }

        this.sampleInfoViewport.dispose();
        this.sampleNameViewport.dispose();

        this.removeTrackScrollMouseHandlers();
        this.outerScroll.remove();

        this.removeTrackDragMouseHandlers();
        this.dragHandle.remove();

        this.removeTrackGearMouseHandlers();
        this.gearContainer.remove();

        if (typeof this.track.dispose === "function") {
            this.track.dispose();
        }

        for (let key of Object.keys(this)) {
            this[key] = undefined;
        }

        if (this.alert) {
            this.alert.container.remove();
        }

        this.disposed = true;
    }

    paintAxis() {
        if (typeof this.track.paintAxis === 'function') {
            const { width, height } = this.axisCanvas.getBoundingClientRect();
            const dpi = window.devicePixelRatio || 1;
            this.axisCanvas.height = dpi * height;
            this.axisCanvas.width = dpi * width;

            const axisCanvasContext = this.axisCanvas.getContext('2d');
            axisCanvasContext.scale(dpi, dpi);

            if (this.track.autoscaleGroup) {
                if (autoScaleGroupColorHash[this.track.autoscaleGroup] === undefined) {
                    const colorPalette = colorPalettes['Dark2'];
                    const randomIndex = Math.floor(Math.random() * colorPalettes['Dark2'].length);
                    autoScaleGroupColorHash[this.track.autoscaleGroup] = colorPalette[randomIndex];
                }
                const rgba = IGVColor.addAlpha(autoScaleGroupColorHash[this.track.autoscaleGroup], 0.75);
                this.track.paintAxis(axisCanvasContext, width, height, rgba);
            } else {
                this.track.paintAxis(axisCanvasContext, width, height, undefined);
            }
        }
    }

    maxViewportContentHeight() {
        return Math.max(...this.viewports.map(viewport => viewport.getContentHeight()));
    }

    setTrackSelectionState(axis, doEnableMultiSelection) {
        const container = axis.querySelector('div');

        if (doEnableMultiSelection !== false) {
            container.style.display = 'grid';
        } else {
            const trackSelectInput = container.querySelector('[name=track-select]');
            trackSelectInput.checked = this.track.selected;

            if (this.dragHandle) {
                this.setDragHandleSelectionState(false);
            }

            container.style.display = 'none';
        }
    }

    setDragHandleSelectionState(isSelected) {
        const dragHandle = this.dragHandle;

        if (isSelected) {
            dragHandle.classList.remove('igv-track-drag-handle-color');
            dragHandle.classList.remove('igv-track-drag-handle-hover-color');
            dragHandle.classList.add('igv-track-drag-handle-selected-color');
        } else {
            dragHandle.classList.remove('igv-track-drag-handle-hover-color');
            dragHandle.classList.remove('igv-track-drag-handle-selected-color');
            dragHandle.classList.add('igv-track-drag-handle-color');
        }
    }
}

function renderSVGAxis(context, track, axisCanvas, deltaX, deltaY) {
    if (typeof track.paintAxis === 'function') {
        const { y, width, height } = axisCanvas.getBoundingClientRect();

        const str = (track.name || track.id).replace(/\W/g, '');
        const id = `${str}_axis_guid_${DOMUtils.guid()}`;

        context.saveWithTranslationAndClipRect(id, deltaX, y + deltaY, width, height, 0);

        track.paintAxis(context, width, height);

        context.restore();
    }
}

export { igv_axis_column_width };
export default TrackView;
