------------
Object types
------------


Misc notes on major object types

TrackView
---------

The "view" object for an igv track.  Responsible for managing painting the track image and managing user 
interactions with the track.   


Track
-----

The "model" object for an igv track.  Responsible for rendering the track on a surface (typically a canvas 
context) provided by the view.  In some classes renderering is delegated to a pluggable function.

Properties

- type  track type, usually associated with the format of the backing file.  Recognized types include bed, wig, vcf, and bam. If type is not specified it is inferred from the file extension.
- url   url to the file or webservice for this track
- label  
- height  the track height in pixels
- visibilityWindow   for annotation and alignment tracks, features are not shown when zoomed out past this value


FeatureSource
-------------

Supplies features on demand to a track.  Typically each track will contain a dedicated FeatureSource backed by
a file or webservice.


AnnotationFeature
-----------------


Required properties:

chr
start
end



DataFeature
------------

chr
start
end
value


Renderer
--------

Function to render a single annotation feature.  Signature is

function(feature, bpStart, xScale, canvas)
