// Define a feature source that reads from non-indexed bed files

var igv = (function (igv) {

    /**
     * @param url - url to a .wig file
     * @param decode - url to a .wig file
     * @param binary - url to a .wig file
     * @param localFile - url to a .wig file
     * @constructor
     */
    igv.BedFeatureSource = function (urlOrFile, decode, binary) {

        if (urlOrFile instanceof File) {
            this.localFile = urlOrFile;
            this.filename = urlOrFile.name;
        }
        else {
            this.url = urlOrFile;
            this.filename = urlOrFile;
        }
        this.decode = decode;
        this.binary = binary;

        if (decode === undefined) {
            if (this.filename.endsWith(".narrowPeak") || this.filename.endsWith(".narrowPeak.gz") ||
                this.filename.endsWith(".broadPeak") || this.filename.endsWith(".broadPeak.gz")) {
                this.decode = decodePeak;
            }
            else {
                this.decode = decodeBed;
            }
        }

        this.maxFeatureCount = Number.MAX_VALUE;

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
    igv.BedFeatureSource.prototype.getFeatures = function (queryChr, bpStart, bpEnd, success) {

        var myself = this;

        if (this.featureCache) {
            success(this.featureCache.queryFeatures(queryChr, bpStart, bpEnd));
        }
        else {
            this.loadFeatures(function (treeMap) {
                //myself.featureMap = featureMap;
                myself.featureCache = new FeatureCache(treeMap);
                // Finally pass features for query interval to continuation
                success(myself.featureCache.queryFeatures(queryChr, bpStart, bpEnd));

            });
        }

        function loadFeatures(continuation) {

            if (this.localFile) {

                // TODO -- move this logic to DataLoader

                var localFileDataLoader = new FileReader();

                localFileDataLoader.onload = function (e) {

                    var plain, inflate;

                    if (myself.localFile.name.endsWith(".gz")) {
                        inflate = new Zlib.Gunzip(new Uint8Array(localFileDataLoader.result));

                        plain = inflate.decompress();
                    } else {

                        plain = new Uint8Array(localFileDataLoader.result);
                    }

                    var result = "";
                    for (var i = 0, len = plain.length; i < len; i++) {
                        result = result + String.fromCharCode(plain[i]);
                    }

                    myself.featureLoader(result, continuation);

                };

                localFileDataLoader.onerror = function (e) {
                    console.log("error uploading local file " + myself.localFile.name);
                };

                localFileDataLoader.readAsArrayBuffer(this.localFile);

            }

            else {

                var dataLoader = new igv.DataLoader(this.url);

                if (dataLoader) dataLoader.loadBinaryString(function (data) {

                    myself.featureLoader(data, continuation);
                });

            }
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
            this.loadFeatures(function (treeMap) {
                //myself.featureMap = featureMap;
                myself.featureCache = new FeatureCache(treeMap);
                // Finally pass features for query interval to continuation
                success(myself.featureCache);

            });
        }
    }

    igv.BedFeatureSource.prototype.loadFeatures = function (continuation) {

        var myself = this;
        
        if (this.localFile) {

            // TODO -- move this logic to DataLoader

            var localFileDataLoader = new FileReader();

            localFileDataLoader.onload = function (e) {

                var plain, inflate;

                if (this.localFile.name.endsWith(".gz")) {
                    inflate = new Zlib.Gunzip(new Uint8Array(localFileDataLoader.result));

                    plain = inflate.decompress();
                } else {

                    plain = new Uint8Array(localFileDataLoader.result);
                }

                var result = "";
                for (var i = 0, len = plain.length; i < len; i++) {
                    result = result + String.fromCharCode(plain[i]);
                }

                myself.featureLoader(result, continuation);

            };

            localFileDataLoader.onerror = function (e) {
                console.log("error uploading local file " + myself.localFile.name);
            };

            localFileDataLoader.readAsArrayBuffer(this.localFile);

        }

        else {

            var dataLoader = new igv.DataLoader(this.url);

            if (dataLoader) dataLoader.loadBinaryString(function (data) {

                myself.featureLoader(data, continuation);
            });

        }
    }

    igv.BedFeatureSource.prototype.featureLoader = function (data, continuation) {

        var myself = this,
            decode = this.decode,
            maxFeatureCount = this.maxFeatureCount,
            feature,
            featureCache = {},
            lines = data.split("\n"),
            len = lines.length,
            tokens,
            allFeatures,
            line,
            chromosomes = [],    // Temporary cache
            chr,
            i,
            cnt = 0,
            j;

        allFeatures = [];
        for (i = 0; i < len; i++) {
            line = lines[i];
            if (line.startsWith("track") || line.startsWith("#") || line.startsWith("browser")) {
                if (line.startsWith("track")) {
                    myself.trackProperties = igv.ucsc.parseTrackLine(line);
                }
                continue;
            }
            tokens = lines[i].split("\t");
            feature = decode(tokens);

            if (feature) {
                if (allFeatures.length < maxFeatureCount) {
                    allFeatures.push(feature);
                }
                else {
                    // Resevoir sampling,  conditionally replace existing feature with new one.
                    j = Math.floor(Math.random() * cnt);
                    if (j < maxFeatureCount) {
                        allFeatures[j] = feature;
                    }
                }
                cnt++;
            }
        }


        allFeatures.forEach(function (feature) {
            var chr = feature.chr,
                geneList = featureCache[chr];

            if (!geneList) {
                chromosomes.push(chr);
                geneList = [];
                featureCache[chr] = geneList;
            }

            geneList.push(feature);

        });

        // Now build interval tree for each chromosome
        var treeMap = {};
        for (i = 0; i < chromosomes.length; i++) {
            chr = chromosomes[i];
            treeMap[chr] = buildIntervalTree(featureCache[chr]);
        }

        continuation(treeMap);
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


    function decodeBed(tokens) {

        var chr, start, end, id, name, tmp, idName, strand, cdStart, exonCount, exonSizes, exonStarts, exons, feature,
            eStart, eEnd;

        if (tokens.length < 3) return null;

        chr = tokens[0];
        if (!chr.startsWith("chr")) chr = "chr" + chr;  // TODO -- use genome aliases
        start = parseInt(tokens[1]);
        end = tokens.length > 2 ? parseInt(tokens[2]) : start + 1;

        feature = {chr: chr, start: start, end: end};

        if (tokens.length > 3) {
            // Note: these are very special rules for the gencode gene files.
            tmp = tokens[3].replace(/"/g, '');
            idName = tmp.split(';');
            for (var i = 0; i < idName.length; i++) {
                var kv = idName[i].split('=');
                if (kv[0] == "gene_id") {
                    id = kv[1];
                }
                if (kv[0] == "gene_name") {
                    name = kv[1];
                }
            }
            feature.id = id ? id : tmp;
            feature.name = name ? name : tmp;
        }

        if (tokens.length > 4) {
            feature.score = parseFloat(tokens[4]);
        }
        if (tokens.length > 5) {
            feature.strand = tokens[5];
        }
        if (tokens.length > 6) {
            feature.cdStart = parseInt(tokens[6]);
        }
        if (tokens.length > 7) {
            feature.cdEnd = parseInt(tokens[7]);
        }
        if (tokens.length > 8) {
            feature.rgb = tokens[8];
        }
        if (tokens.length > 11) {
            exonCount = parseInt(tokens[9]);
            exonSizes = tokens[10].split(',');
            exonStarts = tokens[11].split(',');
            exons = [];

            for (var i = 0; i < exonCount; i++) {
                eStart = start + parseInt(exonStarts[i]);
                eEnd = eStart + parseInt(exonSizes[i]);
                exons.push({start: eStart, end: eEnd});
            }

            feature.exons = exons;
        }

        return feature;

    }

    function decodePeak(tokens) {

        var tokenCount, chr, start, end, strand, name, score, qValue, signal, pValue;

        tokenCount = tokens.length;
        if (tokenCount < 9) {
            return null;
        }

        chr = tokens[0];
        start = parseInt(tokens[1]);
        end = parseInt(tokens[2]);
        name = tokens[3];
        score = parseFloat(tokens[4]);
        strand = tokens[5].trim();
        signal = parseFloat(tokens[6]);
        pValue = parseFloat(tokens[7]);
        qValue = parseFloat(tokens[8]);

        return {chr: chr, start: start, end: end, name: name, score: score, strand: strand, signal: signal,
            pValue: pValue, qValue: qValue};
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
