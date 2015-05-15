<!--Note: This document is written in "markdown".  Please respect the arkdown conventions (http://daringfireball.net/projects/markdown/) when editig. -->



##Browser Configuration

----


option  | description | default
------ | ------- | ------------
genome  | UCSC genome identifier.  Either genome or reference must be defined |
reference | Object defining reference sequence.  See table below.  Required if genome property is not specified. |
showKaryo | If true, whole-genome karyotype view is displayed. | false
showNavigation | If true, show basic navigation controls (search, zoom in, zoom out). | true
tracks | Array of configuration objects defining tracks initially displayed when app launches. |
trackDefaults |  Embedded object defining default settings for specific track types (see table below). |
locus | Initial genomic location |
flanking  | Distance (in bp) to pad sides of gene when navigating. | 1000


Predefined genomes
* hg18
* hg19


### Reference
option  | description | default
fastaURL | URL to an indexed fasta file. |
cytobandURL | URL to a cytoband ideogram file in UCSC format.  Optional.  |
id | UCSD identifier |



##Track Configuration

###General options applicable to all track types

With exception of "url" all parameters are optional.

option | description
--------|  ----------------
url | URL to the file or webservice.  Required.
indexURL | URL to associated index file (bai, idx, or tbi file)
headURL | URL for "HEAD" requests.   Useful for Amazon signed urls, where head and get url can differ.
type | String identifying type of file.  Recognized types include  "bed", "vcf", "bam", and "seg".
name | User-visible name for the track
color | Default color for features.
height | Initial track height
maxHeight | Maximum track height for track types that automatically expand.
order | Integer specifying vertical track layout.  Generally used to pin track to top (large negative number) or bottom (large positive number).

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



