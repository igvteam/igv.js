<!--Note: This document is written in "markdown".  Please respect the arkdown conventions (http://daringfireball.net/projects/markdown/) when editig. -->



##Browser Configuration


option | default | description
------ | ------- | ------------
genome  | | Genome identifier. *Required if fastaURL not specified.*
fastaURL  | | Indexed fasta file URL.  *Required if genome id is not specified.*
cytobandURL | | Cytoband file URL, UCSC format.  Required if genome id not specified.
showKaryo | false | If true, whole-genome karyotype view is displayed.
showNavigation | true | If true, show basic navigation controls (search, zoom in, zoom out).
tracks | |Array of track descriptors initially displayed when app launches.
trackDefaults | | Default settings for specific track type (see example below).
locus | | Initial genome location
flanking | 1000 | Distance (in bp) to pad sides of gene when navigating.


##Track Configuration

###General options applicable to all track types

With exception of "url" all parameters are optional.

option | description
--------|  ----------------
url | Resource url.  A protocol-less url is recommended if the server supports both http and https (e.g. //www.broadinstitute.org/...)
indexURL | URL to associated index file (bai, idx, or tbi file)
headURL | URL for "HEAD" requests.   Useful for Amazon signed urls, where head and get url can differ.
type | String identifying type of file.  Recognized types include  "bed", "vcf", "bam", and "seg".
label | User-visible name for the track
color | Default color for features.  Can be overriden in certain file formats.
height | Initial track height
maxHeight | Maximum track height for track types that automatically expand.  Can be overriden by user via menu
order | Integer specifying vertical track layout.  Use to pin track to top (large negative number) or bottom (large positive number).

####Alignment track (type = "bam")

option | description | default value
-------- | ---------------- | ----------------
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
-------- | ---------------- | ----------------
sampleHeight | Height of individual sample row | 2
posColorScale | Heat map scale for copy number gain | n/a
negColorScale | Heat map scale for copy number loss | n/a

<!-- TODO -- heatmap scale json description -->



