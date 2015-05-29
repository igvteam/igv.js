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

var cursor = (function (cursor) {

    const resevoirSampledRegionListLength = 10000;

    cursor.CursorModel = function (browser) {

        this.browser = browser;

        this.regionWidth = 100;
        $( "input[id='regionSizeInput']" ).val( this.regionWidth );

        this.framePixelWidth = 24;
        $( "input[id='frameWidthInput']" ).val( this.framePixelWidth );

        this.frameMargin = 6;
        this.tracks = [];

        this.regions = [];
        this.filteredRegions = this.regions;

    };

    cursor.CursorModel.prototype.updateRegionDisplay = function()  {

        var igvCursorUIHeaderBlurb = $('.igv-cursor-ui-header-blurb'),
            trackLabelSpan = igvCursorUIHeaderBlurb.find('span')[1],
            regionCountSpan = igvCursorUIHeaderBlurb.find('span')[0],
            filteredRegionCountSpan = igvCursorUIHeaderBlurb.find('span')[2];

        igvCursorUIHeaderBlurb.css({
            "display" : "block"
        });

        $(trackLabelSpan).text( this.browser.designatedTrack ? this.browser.designatedTrack.name : "unnamed" );

        $(trackLabelSpan).css({
            "color" : this.browser.highlightColor
        });

        $(regionCountSpan).text( igv.numberFormatter(this.regions.length) );

        $(regionCountSpan).css({
            "color" : this.browser.highlightColor
        });

        $(filteredRegionCountSpan).text( igv.numberFormatter(this.filteredRegions.length) );

        $(filteredRegionCountSpan).css({
            "color" : "rgba(3, 116, 178, 1.0)"
        });

    };

    cursor.CursorModel.prototype.regionsToRender = function () {

        return (undefined === this.subSampledFilteredRegions) ? this.filteredRegions : this.subSampledFilteredRegions;
    };

    cursor.CursorModel.prototype.setRegions = function (features) {

        var featuresLength,
            i;

        this.regions = [];

        for (i = 0, featuresLength = features.length; i < featuresLength; i++) {
            this.regions.push(new cursor.CursorRegion(features[i]));
        }

        this.filteredRegions = this.regions;

        this.updateRegionDisplay();

        this.filterRegions();

    };

    cursor.CursorModel.prototype.initializeHistogram = function (track, continutation) {

        var myself = this;

        track.cursorHistogram.initializeBins();

        if (undefined === this.regions || 0 === this.regions.length) {

            if (continutation) {
                continutation();
            }

        }

        // NOTE -- don't access track's feature source directly!
        track.getFeatureCache(function (featureCache) {

            myself.regions.forEach(function (region) {

                var score = region.getScore(featureCache, myself.regionWidth);
                track.cursorHistogram.insertScore(score);

            });

            track.cursorHistogram.render(track);

            if (continutation) {
                continutation();
            }

        });

    };

    cursor.CursorModel.prototype.filterRegions = function () {

        var trackPackages = [],
            filterPackages = [],
            howmany = 0,
            trackViewThatIsSorted,
            myself = this;


        // TODO: HACK HACK HACK
        // TODO: Clean this up during sort reorg is finished
        // TODO: sorting will be lost during filtering
        $(this.browser.trackContainerDiv).find("i.fa-signal").each(function() {

            var me = $(this);
            if (me.hasClass("igv-control-sort-fa-selected")) {

                me.removeClass("igv-control-sort-fa-selected");
            }

         });

        this.browser.trackViews.forEach(function (trackView, tpIndex, trackViews) {

            trackView.track.getFeatureCache(function (featureCache) {

                trackPackages.push({ track: trackView.track, trackFilter: trackView.track.trackFilter, featureCache: featureCache, cursorHistogram: trackView.track.cursorHistogram });

                if (trackView.track.isSortTrack()) {
                    trackViewThatIsSorted = trackView;
                }

                if (trackView.track.trackFilter.isFilterActive) {
                    filterPackages.push({trackFilter: trackView.track.trackFilter, featureCache: featureCache });
                }

                if (++howmany === trackViews.length) runFilters();
            });
        });

        function runFilters() {

            if (0 === filterPackages.length) {
                // No filters
                myself.filteredRegions = myself.regions;
            }
            else {

                myself.filteredRegions = [];

                myself.regions.forEach(function (region) {

                    var success,
                       passFilter = true;

                    trackPackages.forEach(function (trackPackage) {

                        if (true === passFilter) {

                            success = trackPackage.trackFilter.evaluate(trackPackage.featureCache, region, myself.regionWidth);
                            if (false === success) {

                                passFilter = false;
                            }

                        }

                    });

                    if (passFilter) {
                        myself.filteredRegions.push(region);
                    }

                });
            }

            if (0 === myself.filteredRegions.length) {

                myself.browser.update();

                myself.browser.fitToScreen();

                return;
            }

            var thresholdFramePixelWidth = myself.browser.trackViewportWidth() / myself.filteredRegions.length;

            if (undefined !== thresholdFramePixelWidth && trackViewThatIsSorted) {

                myself.browser.presentSortStatus(trackViewThatIsSorted);

                myself.sortRegions(trackViewThatIsSorted.track.featureSource, myself.browser.sortDirection, function () {

                    if (myself.framePixelWidth < thresholdFramePixelWidth) {
                        myself.browser.setFrameWidth(thresholdFramePixelWidth);
                    } else {
                        myself.browser.update();
                    }


                });

            } else {

                if (myself.filteredRegions.length >= Number.MAX_VALUE /*resevoirSampledRegionListLength*/) {

                    myself.subSampledFilteredRegions = resevoirSampledRegionList(myself.filteredRegions, resevoirSampledRegionListLength);
                } else {

                    myself.subSampledFilteredRegions = myself.filteredRegions;
                }

                if (myself.framePixelWidth < thresholdFramePixelWidth) {
                    myself.browser.setFrameWidth(thresholdFramePixelWidth);
                } else {
                    myself.browser.update();
                }
                
            }

            myself.updateRegionDisplay();

            myself.browser.fitToScreen();


            // better histogram code
            trackPackages.forEach(function (trackPackage) {

                trackPackage.cursorHistogram.initializeBins();

                myself.regions.forEach(function (region) {

                    var score,
                        doIncludeRegionForHistogramRender = true;

                    filterPackages.forEach(function (filterPackage) {

                        var success;

                        if (trackPackage.trackFilter === filterPackage.trackFilter) {

                            // do nothing

                        } else if (true === doIncludeRegionForHistogramRender) {

                            success = filterPackage.trackFilter.evaluate(filterPackage.featureCache, region, myself.regionWidth);

                            if (false === success) {

                                doIncludeRegionForHistogramRender = false;
                            }

                        }

                    });

                    if (doIncludeRegionForHistogramRender) {

                        score = region.getScore(trackPackage.featureCache, myself.regionWidth);
                        trackPackage.cursorHistogram.insertScore(score);
                    }

                });

                trackPackage.cursorHistogram.render(trackPackage.track);

            });

        }

    };

    function resevoirSampledRegionList(regions, max) {

        var subsampledRegions = [],
            len = regions.length,
            i,
            j,
            cnt = 0,
            elem;

        for (i = 0; i < len; i++) {

            elem = regions[ i ];

            if (subsampledRegions.length < max) {
                subsampledRegions.push(elem);
            }
            else {
                // Resevoir sampling,  conditionally replace existing feature with new one.
                j = Math.floor(Math.random() * cnt);
                if (j < max) {
                    subsampledRegions[ j ] = elem;
                }
            }
            cnt++;

        }
        return subsampledRegions;
    }

    /**
     * Sort track based on signals from the feature source.   The continuation is called when sorting is complete.
     *
     * @param featureSource
     * @param sortDirection
     * @param continuation
     */
    cursor.CursorModel.prototype.sortRegions = function (featureSource, sortDirection, continuation) {

        "use strict";

        var myself = this,
            regionWidth = this.regionWidth;

        if (!this.filteredRegions || 0 === this.filteredRegions.length) {
            continuation();
        }

        if (myself.filteredRegions.length >= Number.MAX_VALUE /*resevoirSampledRegionListLength*/) {

            myself.subSampledFilteredRegions = resevoirSampledRegionList(myself.filteredRegions, resevoirSampledRegionListLength);
        } else {

            myself.subSampledFilteredRegions = myself.filteredRegions;
        }







        featureSource.getFeatureCache(function (featureCache) {

            // Assign score to regions for selected track (feature source)
            myself.subSampledFilteredRegions.forEach(function (region) {
                region.sortScore = region.getScore(featureCache, regionWidth);
            });

            var compFunction = function (cursorRegion1, cursorRegion2) {

                var s1 = cursorRegion1.sortScore;
                var s2 = cursorRegion2.sortScore;
                return sortDirection * (s1 === s2 ? 0 : (s1 > s2 ? -1 : 1));
            };

            // First, randomize the frames to prevent memory from previous sorts.  There are many ties (e.g. zeroes)
            // so a stable sort carries a lot of memory, which can imply correlations where none exist.
            myself.subSampledFilteredRegions.shuffle();

            // The built-in sort blows up in Chrome, and possibly other browsers, for large arrays.
            if (myself.subSampledFilteredRegions.length > 1000) {
                myself.subSampledFilteredRegions.heapSort(compFunction);
            }
            else {
                myself.subSampledFilteredRegions.sort(compFunction);
            }

            continuation();
        });


    };

    cursor.CursorRegion = function (feature) {

        this.chr = feature.chr;
        this.location = (feature.start + feature.end) / 2;
    };

    /**
     * Compute a score over the region bounds and pass it on to the continuation.
     *
     * @param featureCache
     * @param regionWidth
     * @returns {number}
     */
    cursor.CursorRegion.prototype.getScore = function (featureCache, regionWidth) {

        var regionStart = this.location - regionWidth / 2,
            regionEnd   = this.location + regionWidth / 2,
            score,
            featureCacheQueryResults,
            features,
            signalColumn = featureCache.signalColumn;

        featureCacheQueryResults = featureCache.queryFeatures(this.chr, regionStart, regionEnd);

        // If no features, bail.
        if (!featureCacheQueryResults || 0 === featureCacheQueryResults.length) {
            return -1;
        }

        // Only assess scores for features bounded bu the region
        features = [];
        featureCacheQueryResults.forEach(function (f){

            if (f.end >= regionStart && f.start < regionEnd) {
                features.push(f);
            }

        });

        // If no features, bail.
        if (0 === features) {
            return -1;
        }

        score = 0;
        featureCacheQueryResults.forEach(function (feature) {

            if (undefined === feature[signalColumn]) {

                // Have a feature, but no defined score
                score = 1000;
            } else {

                // Take max score of all features in region
                score = Math.max(feature[signalColumn], score);
            }

        });

        if (-1 === score) {
            console.log("Features " + featureList.length + ". Should not return score = -1 for filter consideration.");
        }

        return score;
    };

    cursor.CursorRegion.prototype.isRegionEmpty = function (featureCache, regionWidth) {

        var halfWidth = regionWidth/2,
            featureList;

        featureList = featureCache.queryFeatures(this.chr, this.location - halfWidth, this.location + halfWidth);

        return (featureList) ? true : false;

    };

    // BED Format: The first 100 bases of a chromosome are defined as chromStart=0, chromEnd=100,
    // and span the bases 0 - 99.
    cursor.CursorRegion.prototype.exportRegion = function (regionWidth) {

        var halfWidth = regionWidth/ 2,
            ss = Math.floor(    this.location - halfWidth),
            ee = Math.floor(1 + this.location + halfWidth);

        return this.chr + "\t" + ss + "\t" + ee + "\n";

    };

    function isChrome() {
        return navigator.userAgent.contains("Chrome");
    }

    return cursor;

})(cursor || {});