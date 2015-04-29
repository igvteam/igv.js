<!--Note: This document is written in "markdown".  Please respect the arkdown conventions (http://daringfireball.net/projects/markdown/) when editig. -->



##Browser Configuration Options##

option | status | description
--------: | :-------- | :----------------
`showKaryo` | optional | If true, whole-genome karyotype view is displayed.
`showNavigation` | optional | If true, show basic navigation controls (search, zoom in, zoom out).
`fastaURL` | required | Indexed fasta file URL.  Required if genome id is not specified.
`cytobandURL`  | required | Cytoband file URL, UCSC format.  Required if genome id not specified.
`genome` | required | Genome identifier. Required if fastaURL not specified.
`tracks` | optional | Array of track descriptors initially displayed when app launches.
`trackDefaults` | optional | Default settings for specific track type (see example below).
`locus` | optional | Initial genome location
`flanking` | optional | Distance (in bp) to pad sides of gene when navigating.


###Track Defaults. BAM track example.###
The following code sets the default coverage threshold value to `0.2` and also enables quality weighting when performing the mismatch calculation.

            trackDefaults : {
                bam: {
                    coverageThreshold: 0.2,
                    coverageQualityWeight: true
                }
            }

###General options applicable to all track types###

Tracks configuration uses json-style objects.   With exception of "url" all parameters are optional.

option | description
--------: |  :----------------
url | Resource url.  A protocol-less url is recommended if the server supports both http and https (e.g. //www.broadinstitute.org/...)
indexURL | URL to associated index file (bai, idx, or tbi file)
headURL | URL for "HEAD" requests.   Useful for Amazon signed urls, where head and get url can differ.
type | String identifying type of file.  Recognized types include  "bed", "vcf", "bam", and "seg".
label | User-visible name for the track
color | Default color for features.  Can be overriden in certain file formats.
height | Initial track height
maxHeight | Maximum track height for track types that automatically expand.  Can be overriden by user via menu
order | Integer specifying vertical track layout.  Use to pin track to top (large negative number) or bottom (large positive number).

####Alignment track (type = "bam")####

option | description | default value
--------: | :---------------- | :----------------:
visibilityWindow | Window size in bp at which alignments are loaded.  | 30000 (30kb)
alignmentRowHeight | Height of each alignment row.  | 14
coverageTrackHeight | Height of coverage track | 50
alignmentColor | Default color for alignments | "rgb(185, 185, 185)"
negStrandColor | For "color by strand" option. | "rgb(150, 150, 230)"
posStrandColor | For "color by strand" option. | "rgb(230, 150, 150)"
deletionColor | Color of line connecting blocks from deletion (cigar = "d").  | "black"
skippedColor | Color of line connection blocks for cigar "n". | "rgb(150, 170, 170)"
coverageColor | Color of coverage track. | "rgb(185, 185, 185)"

####Copy number track (type = "seg")####

option | description | default value
--------: | :---------------- | :----------------:
sampleHeight | Height of individual sample row | 2
posColorScale | Heat map scale for copy number gain | n/a
negColorScale | Heat map scale for copy number loss | n/a

TODO -- heatmap scale json description

###Track API###
Some track types have an API that controls both the rendering style used to present features and how - if desired - features are filtered out of a presentation.

####Alignment Shading####
Here we set the alignment rendering color based on the strand. Use `"none"` to set the color to the current `alignmentColor` setting.

	var bamTrack = new igv.BAMTrack(config);
	bamTrack.alignmentShading = "strand";

####Alignment Row Sorting####
Alignment rows can be sorted by nucleotide, start location, or strand using the strings `"NUCLEOTIDE"`, `"START"` or `"STRAND"` respectively. Here we sort by nucleotide.

	var bamTrack = new igv.BAMTrack(config);
	bamTrack.sortOption = { sort: "NUCLEOTIDE" };

Sort is performed with the `sortAlignmentRows(genomicLocation, sortOption, continuation)` function.

	bamTrack.sortAlignmentRows(genomicLocation, bamTrack.sortOption, continuation);

####Alignment Row Filtering####
Alignment rows can be filtered by mapping quality and strand. Filtering is performed by basing a filter options object to the function `bamTrack.filterAlignments(filterOption, continuation)`.

Here is the format of a filter option:

	{
		name : filterName,
		params : [ param0, param1, ..., paramN ]
	}

Supported filters:
#####mapping quality#####
Set either to `undefined` to ignore that threshold

	{
		name : mappingQuality,
		params : [ lowQuality, lowQuality ]
	}

#####strand#####

	{
		name : strand,
		params : [ true or false ]
	}

