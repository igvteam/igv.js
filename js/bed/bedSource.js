var igv = (function (igv) {

    /**
     * feature source for "bed like" files (tab delimited files with 1 feature per line: bed, gff, vcf, etc)
     *
     * @param config
     * @constructor
     */
    igv.BedFeatureSource = function (config) {

        if (config.localFile) {
            this.localFile = config.localFile;
            this.filename = config.localFile.name;
        }
        else {
            this.url = config.url;
            this.filename = config.url;
        }

        // TODO -- move this code to a factory method
        if (config.type === "vcf") {
            this.parser = igv.vcfParser();
        }
        else {
            this.parser = igv.bedParser(config.type);
        }

    };

    /**
     * Required function fo all data source objects.  Fetches features for the
     * range requested and passes them on to the success function.  Usually this is
     * a function that renders the features on the canvas
     *
     * @param queryChr
     * @param bpStart
     * @param bpEnd
     * @param success -- function that takes an array of features as an argument
     */
    igv.BedFeatureSource.prototype.getFeatures = function (queryChr, bpStart, bpEnd, success, task) {

        var myself = this;

        if (this.featureCache) {
            success(this.featureCache.queryFeatures(queryChr, bpStart, bpEnd));
        }
        else {
            this.loadFeatures(function (featureList) {
                    //myself.featureMap = featureMap;
                    myself.featureCache = new igv.FeatureCache(featureList);
                    // Finally pass features for query interval to continuation
                    success(myself.featureCache.queryFeatures(queryChr, bpStart, bpEnd));

                },
                task);
        }

    };

    igv.BedFeatureSource.prototype.allFeatures = function (success) {

        this.getFeatureCache(function (featureCache) {
            success(featureCache.allFeatures());
        });

    };

    /**
     * Get the feature cache.  This method is exposed primarily for use by "cursor"
     * @param success
     */
    igv.BedFeatureSource.prototype.getFeatureCache = function (success) {

        var myself = this;

        if (this.featureCache) {
            success(this.featureCache);
        }
        else {
            this.loadFeatures(function (featureList) {
                //myself.featureMap = featureMap;
                myself.featureCache = new igv.FeatureCache(featureList);
                // Finally pass features for query interval to continuation
                success(myself.featureCache);

            });
        }
    }

    igv.BedFeatureSource.prototype.loadFeatures = function (continuation, task) {

        var parser = this.parser,
            options = {
                success: function (result) {
                    parseFeatures(parser, result, continuation);
                },
                task: task
            };

        if (this.localFile) {
            igvxhr.loadStringFromFile(this.localFile, options);
        }

        else {
            igvxhr.loadString(this.url, options);
        }
    }

    function parseFeatures(parser, data, continuation) {

        var allFeatures = parser.parseFeatures(data);


        continuation(allFeatures);
    };

    /**
     * Build an interval tree from the feature list for fast interval based queries.   We lump features in groups
     * of 10, or total size / 100,   to reduce size of the tree.
     *
     * @param featureList
     */
    function buildIntervalTree(featureList) {

        var i, e, iStart, iEnd, tree, chunkSize, len, subArray;

        tree = new igv.IntervalTree();
        len = featureList.length;

        chunkSize = Math.max(10, Math.round(len / 100));

        featureList.sort(function (f1, f2) {
            return (f1.start === f2.start ? 0 : (f1.start > f2.start ? 1 : -1));
        });

        for (i = 0; i < len; i += chunkSize) {
            e = Math.min(len, i + chunkSize);
            subArray = featureList.slice(i, e);
            iStart = subArray[0].start;
            //
            iEnd = iStart;
            subArray.forEach(function (feature) {
                iEnd = Math.max(iEnd, feature.end);
            });
            tree.insert(iStart, iEnd, subArray);
        }

        return tree;
    }


    FeatureCache = function (treeMap) {
        this.treeMap = treeMap;
    }

    FeatureCache.prototype.queryFeatures = function (chr, start, end) {

        var chrFeatures, featureList, intervalFeatures, feature, len, i, tree, intervals;

        tree = this.treeMap[chr];

        if (!tree) return [];

        intervals = tree.findOverlapping(start, end);

        if (intervals.length == 0) {
            return [];
        }
        else {
            // Trim the list of features in the intervals to those
            // overlapping the requested range.
            // Assumption: features are sorted by start position

            featureList = [];

            intervals.forEach(function (interval) {
                intervalFeatures = interval.value;
                len = intervalFeatures.length;
                for (i = 0; i < len; i++) {
                    feature = intervalFeatures[i];
                    if (feature.start > end) break;
                    else if (feature.end >= start) {
                        featureList.push(feature);
                    }
                }
            });

            return featureList;
        }

    };

    FeatureCache.prototype.allFeatures = function () {

        var allFeatures = [];
        var treeMap = this.treeMap;
        if (treeMap) {
            for (var key in treeMap) {
                if (treeMap.hasOwnProperty(key)) {

                    var tree = treeMap[key];
                    tree.mapIntervals(function (interval) {
                        allFeatures = allFeatures.concat(interval.value);
                    });
                }
            }
        }
        return allFeatures;

    }

    return igv;
})(igv || {});
