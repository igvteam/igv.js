var cursor = (function (cursor) {

    cursor.CursorModel = function (browser, regionDisplayJQueryObject) {

        this.browser = browser;
        this.regionDisplayJQueryObject = regionDisplayJQueryObject;

        this.regionWidth = 100;
        this.framePixelWidth = 24;

        this.frameMargin = 6;
        this.origin = 0;
        this.tracks = [];
        this.regions = [];

        this.prohibitSelfFilteringTrackHistogram = true;
    };

    cursor.CursorModel.prototype.updateRegionDisplay = function() {

        var numer = igv.numberFormatter(this.getRegionList().length),
            denom = igv.numberFormatter(this.regions.length);

        this.regionDisplayJQueryObject.text("Regions " + numer + " / " + denom);
    };

    cursor.CursorModel.prototype.getRegionList = function () {

        return (undefined === this.filteredRegions) ? this.regions : this.filteredRegions;
    };

    cursor.CursorModel.prototype.setRegions = function (features) {

        var len, i;

        this.regions = [];
        this.filteredRegions = undefined;

        for (i = 0, len = features.length; i < len; i++) {
            this.regions.push(new cursor.CursorRegion(features[i]));
        }
        this.updateRegionDisplay();
        this.filterRegions();

    };

    cursor.CursorModel.prototype.initializeHistogram = function (track, continutation) {

        var myself = this;

        track.cursorHistogram.initializeBins();

        track.featureSource.getFeatureCache(function (featureCache) {

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
            trackFilterPackages = [],
            howmany = 0,
            myself = this,
            noop = true;

        this.browser.trackPanels.forEach(function (trackPanel, tpIndex, trackPanels) {

            trackPanel.track.getFeatureCache(function (featureCache) {

                trackPackages.push({ track: trackPanel.track, trackFilter: trackPanel.track.trackFilter, featureCache: featureCache, cursorHistogram: trackPanel.track.cursorHistogram });

                if (!trackPanel.track.trackFilter.isNoOp()) {
                    trackFilterPackages.push({trackFilter: trackPanel.track.trackFilter, featureCache: featureCache });
                }

                if (++howmany == trackPanels.length) runFilters();
            });
        });

        function runFilters() {

            if (0 === trackFilterPackages.length) {
                // No filters
                myself.filteredRegions = myself.regions;
            }
            else {

                myself.filteredRegions = [];

                myself.regions.forEach(function (region) {

                    var score,
                        passFilter = true;

                    trackPackages.forEach(function (trackPackage) {

                        if (true === passFilter) {

                            score = region.getScore(trackPackage.featureCache, myself.regionWidth);

                            if (false === trackPackage.trackFilter.isIncluded(score)) {

                                passFilter = false;
                            }

                        }

                    });

                    if (passFilter) {
                        myself.filteredRegions.push(region);
                    }

                });
            }

            myself.updateRegionDisplay();

            // If filteredRegions set is > 10,000 downsample
            myself.filteredRegions = downsample(myself.filteredRegions, 10000);

            myself.browser.update();

            // better histogram code
            trackPackages.forEach(function (tp) {

                tp.cursorHistogram.initializeBins();

                myself.regions.forEach(function (r) {

                    var score,
                        doIncludeRegionForHistogramRender = true;

                    trackFilterPackages.forEach(function (tfp) {

                        if (tp.trackFilter === tfp.trackFilter) {

                            // do nothing
                        } else if (true === doIncludeRegionForHistogramRender) {

                            score = r.getScore(tfp.featureCache, myself.regionWidth);

                            if (false === tfp.trackFilter.isIncluded(score)) {

                                doIncludeRegionForHistogramRender = false;
                            }

                        }

                    });

                    if (doIncludeRegionForHistogramRender) {

                        score = r.getScore(tp.featureCache, myself.regionWidth);
                        tp.cursorHistogram.insertScore(score);
                    }

                });

                tp.cursorHistogram.render(tp.track);

            });

        }

        function downsample(array, max) {

            var downsampled = [],
                len = array.length,
                i,
                j,
                cnt = 0,
                elem;

            for (i = 0; i < len; i++) {

                elem = array[i];

                if (downsampled.length < max) {
                    downsampled.push(elem);
                }
                else {
                    // Resevoir sampling,  conditionally replace existing feature with new one.
                    j = Math.floor(Math.random() * cnt);
                    if (j < max) {
                        downsampled[j] = elem;
                    }
                }
                cnt++;

            }
            return downsampled;
        }
    };

    /**
     * Sort track based on signals from the feature source.   The continuation is called when sorting is complete.
     *
     * @param featureSource
     * @param sortDirection
     * @param continuation
     */
    cursor.CursorModel.prototype.sortRegions = function (featureSource, sortDirection, continuation) {

        "use strict";

        console.log(navigator.userAgent);

        var regionWidth = this.regionWidth,
            regions = this.getRegionList(),
            filteredRegions = this.filteredRegions;

        if (!regions || 0 === regions.length) {
            continuation();
        }


        featureSource.getFeatureCache(function (featureCache) {

            // Assign score to regions for selected track (feature source)
            regions.forEach(function (region) {
                region.sortScore = region.getScore(featureCache, regionWidth);
            });

            var compFunction = function (cursorRegion1, cursorRegion2) {

                var s1 = cursorRegion1.sortScore;
                var s2 = cursorRegion2.sortScore;
                return sortDirection * (s1 === s2 ? 0 : (s1 > s2 ? -1 : 1));
            };

            // First, randomize the frames to prevent memory from previous sorts.  There are many ties (e.g. zeroes)
            // so a stable sort carries a lot of memory, which can imply correlations where none exist.
            regions.shuffle();

            // The built-in sort blows up in Chrome, and possibly other browsers, for large arrays.
            if (regions.length > 1000) {
                regions.heapSort(compFunction);
            }
            else {
                regions.sort(compFunction);
            }


            continuation();
        });


    };

    cursor.CursorRegion = function (feature) {

        this.chr = feature.chr;
        this.location = Math.round((feature.start + feature.end) / 2);
    };

    /**
     * Compute a score over the region bounds and pass it on to the continuation.
     *
     * @param featureCache
     * @param regionWidth
     * @returns {number}
     */
    cursor.CursorRegion.prototype.getScore = function (featureCache, regionWidth) {

        var score = -1,
            featureList,
            regionStart,
            regionEnd;

        regionStart = this.location - regionWidth / 2;
        regionEnd = this.location + regionWidth / 2;

        featureList = featureCache.queryFeatures(this.chr, regionStart, regionEnd);

        if (!featureList) {
            return score;
        }

        featureList.forEach(function (feature) {

            if (undefined === feature.score) {   // Have a feature, but no defined score
                score = 1000;
            } else if (feature.end >= regionStart && feature.start < regionEnd) {
                score = Math.max(feature.score, score);
            }

        });

        return score;
    };

    cursor.CursorRegion.prototype.isRegionEmpty = function (featureCache, regionWidth) {

        var halfWidth = regionWidth/ 2,
            featureList;

        featureList = featureCache.queryFeatures(this.chr, this.location - halfWidth, this.location + halfWidth);

        return (featureList) ? true : false;

    };

    function isChrome() {
        return navigator.userAgent.contains("Chrome");
    }

    return cursor;

})(cursor || {});