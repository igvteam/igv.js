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
