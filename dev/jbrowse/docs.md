Notes from email

The first version of our standalone circular view is now published, here are the updated links to the builds:

Development: https://unpkg.com/@jbrowse/react-circular-genome-view/dist/react-circular-genome-view.umd.development.js
Production: https://unpkg.com/@jbrowse/react-circular-genome-view/dist/react-circular-genome-view.umd.production.min.js

... As an idea, there is a "state" object that gets created when using our circular view, and that object could possibly be passed in with the options in igv.createBrowser.

... Our circular view is designed to work using the same data that our linear view uses. The regions on the outside of the circle are defined by an assembly (we use "assembly" instead of "genome", but same idea). The arcs (or "chords" as we call them internally) come from tracks, so for example opening a VCF track on the circular view would show the features in that VCF that have breakends as chords. Also, the circular view is designed with the expectation that you already have the data when you create it, but there are some workarounds that we'll use since that likely isn't possible in this case.


----

Since users will be responsible for having the circular view on the page, they
can choose to do it one of two ways. If they are in a React app, they can do it
like this:

```js
import {
  createViewState,
  JBrowseCircularGenomeView,
} from '@jbrowse/react-circular-genome-view'

const state = createViewState(/* more on what goes here later */)

// Then wherever you want to use this component, just pass `state` as a prop:
<JBrowseCircularGenomeView viewState={state} />
```
If they are not already using React, they will need to load React, ReactDOM,
and our circular view in script tags and then do this:

```js
const { createElement } = React
const { render } = ReactDOM
const {
  createViewState,
  JBrowseCircularGenomeView,
} = JBrowseReactCircularGenomeView

const state = createViewState(/* more on what goes here later */)

render(
  createElement(JBrowseCircularGenomeView, { viewState: state }),
  document.getElementById('id_of_div_here'),
)
```

I propose that the view state created by `createViewState` could then be passed
in to IGV in the options, something like:

```js
const options = {
  genome: "hg38",
  locus: "chr8:127,736,588-127,739,371",
  tracks: [/* tracks */],
  circularState: state,
}
igv.createBrowser(igvDiv, options)
```

IGV will then have a handle on `circularState`, and it will be able to use that
to interact with the circular view.

Since the circular component is designed to have the data already available and
passed in to `createViewState`, we need to pass some empty data holders and
we'll add the data in later. When running `createViewState`, pass in the
following:

```js
const state = new createViewState({
  assembly: {
    name: 'forIGV',
    sequence: {
      trackId: 'refSeqTrack',
      type: 'ReferenceSequenceTrack',
      adapter: {
        type: 'FromConfigSequenceAdapter',
        features: [],
      },
    },
  },
  tracks: [
    {
      trackId: 'firstTrack',
      assemblyNames: ['forIGV'],
      type: 'VariantTrack',
      adapter: {
        type: 'FromConfigAdapter',
        features: [],
      },
    },
  ],
})
```

You can customize the assembly name (be sure to change it in the track's
`assemblyNames`, too) or either of the trackIds if you want, but leave
everything else like that.

Now that we have a valid state, everything below here will be examples of how
IGV can use its handle on `circularState` to do what it needs.

## Set up the regions (chromosomes) on the outside of the circle

We require each region (chromosome) to be in this form:

```js
{
  refName: 'chr1',
  uniqueId: 'chr1',
  start: 0,
  end: 1000,
}
```

The `uniqueId` doesn't have to be the same as the `refName`, but it must be
unique. You would then set the regions of the circle by doing this:

```js
const regions = [
  {
    refName: 'chr1',
    uniqueId: 'chr1',
    start: 0,
    end: 1000,
  },
  {
    refName: 'chr2',
    uniqueId: 'chr2',
    start: 0,
    end: 50,
  },
]
circularState.config.assembly.sequence.adapter.features.set(regions)
circularState.assemblyManager.removeAssembly(
  circularState.assemblyManager.assemblies[0]
)
circularState.assemblyManager.addAssembly(circularState.config.assembly)
```

## Show chords (arcs) on circle

Each chord in the circle is defined as a feature with this form:

```js
{
  uniqueId: 'feature1',
  refName: 'chr1',
  start: 312,
  end: 313,
  mate: {
    refName: 'chr2',
    start: 13,
    end: 14,
  },
}
```

The top-level `refName` and `start` is where the chord starts, and the`refName`
and `start` in `mate` is where the chord ends. (It's required to have an `end`
that is at least `start + 1` in both as well, but the arc is drawn using the
`start` location). Adding chords to the circle would then look like this:

```js
const chords = [
  {
    uniqueId: 'feature1',
    refName: 'chr1',
    start: 312,
    end: 313,
    mate: {
      refName: 'chr2',
      start: 13,
      end: 14,
    },
  },
  {
    uniqueId: 'feature2',
    refName: 'chr1',
    start: 589,
    end: 608,
    mate: {
      refName: 'chr1',
      start: 238,
      end: 239,
    },
  },
]

circularState.config.tracks[0].adapter.features.set(chords)
circularState.session.view.showTrack(circularState.config.tracks[0].trackId)
```

To clear all chords, do the same as above, but with `chords` as an empty array.

## Add a click callback to the chords

A click callback would look like this:

```js
function onChordClick(feature, chordTrack, pluginManager) {
  doSomething(feature)
}
```

You probably won't need the `chordTrack` or `pluginManager` args, they're just
shown above for completeness.

The `feature` object will be based on one of the chords passed in. The
`uniqueId` of the chord can be accessed with `feature.id()`, and e.g. the start
can be accessed with `feature.get('start')`.

To register this callback, you need to run:

```js
circularState.pluginManager.jexl.addFunction('onChordClick', onChordClick)
circularState.config.tracks[0].displays[0].onChordClick.set(
  'jexl:onChordClick(feature, track, pluginManager)'
)
```

## Highlight a chord

To highlight a chord, you need to retrieve the feature for that chord and set it
as the "selection". This is done like:

```js
const featureId = 'feature1' // or whatever the ID is for that chord
const display = circularState.pluginManager.rootModel.session.view.tracks[0].displays[0]
const feature = display.data.features.get(featureId)
circularState.pluginManager.rootModel.session.setSelection(feature)
```

To clear all highlights, do:

```js
circularState.pluginManager.rootModel.session.clearSelection()
```
