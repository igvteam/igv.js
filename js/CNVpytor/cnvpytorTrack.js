/*
* The MIT License (MIT)
*
* Copyright (c) 2016-2017 The Regents of the University of California
* Author: Jim Robinson
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

import TrackBase from "../trackBase.js"
import paintAxis from "../util/paintAxis.js"
import MenuUtils from "../ui/menuUtils.js"
import Read_HDF5 from "./HDF5_Reader.js"
import { CNVpytorVCF } from "./cnvpytorVCF.js"
import FeatureSource from '../feature/featureSource.js'
import $ from "../vendor/jquery-3.3.1.slim.js"
import { createCheckbox } from "../igv-icons.js"



/**
 * Represents 2 or more wig tracks overlaid on a common viewport.
 */

const DEFAULT_TRACK_HEIGHT = 150
const DEFAULT_BAF_TRACK_HEIGHT = 100

class cnvpytorTrack extends TrackBase {

  constructor(config, browser) {
    super(config, browser)
    this.featureType = 'numeric'
    this.paintAxis = paintAxis
    this.graphType = "points"
    // this.defaultScale = true
    if (!config.max){
      this.defaultScale = true
      this.autoscale = false
    }
   
    // Invoke height setter last to allocated to coverage and alignment tracks
    this.height = (config.height !== undefined ? config.height : DEFAULT_TRACK_HEIGHT)
  }

  async init(config) {
    
    this.type = "cnvpytor"
    this.bin_size = config.bin_size || 100000
    this.signal_name = config.signal_name || "rd_snp"
    this.cnv_caller = config.cnv_caller || 'Combined'
    this.colors = config.colors || ['gray', 'black', 'green', 'blue', 'blue']
    
    super.init(config)

  }
  get_signals() {
    let signals = []

    if (this.signal_name == 'rd_snp') {
      signals = ["RD_Raw", "RD_Raw_gc_coor", this.cnv_caller, "BAF1", "BAF2"]
      
    } else if (this.signal_name == 'rd') {
      signals = ["RD_Raw", "RD_Raw_gc_coor", this.cnv_caller]
      
    } else if (this.signal_name == 'snp') {
      signals = ["BAF1", "BAF2"]

    } else if (this.signal_name == 'cnh') {
      signals = [this.cnv_caller]
    }
    return signals
  }
  
  get_signal_colors() {
    let signal_colors
    if (this.signal_name == 'rd_snp') {
      signal_colors = this.colors
    } else if (this.signal_name == 'rd') {
      signal_colors = this.colors
    } else if (this.signal_name == 'snp') {
      signal_colors = this.colors.slice(-2)
    } else if (this.signal_name == 'cnh') {
      signal_colors = this.colors.slice(2, 3)
    }
    return signal_colors
  }

  async postInit() {
    
    if (this.config.format == 'vcf') {
      this.featureSource = FeatureSource(this.config, this.browser.genome)
      this.header = await this.getHeader()


      var allVariants = this.featureSource.reader.features.reduce(function (r, a) {
        r[a.chr] = r[a.chr] || [];
        r[a.chr].push(a);
        return r;
      }, Object.create(null));

      const cnvpytor_obj = new CNVpytorVCF(allVariants, this.bin_size)
      const wigFeatures = await cnvpytor_obj.computeReadDepth()
      const bafFeatures = await cnvpytor_obj.computeBAF_v2()

      // const bafFeatures = [[], []]
      this.wigFeatures_obj = {}
      this.wigFeatures_obj[this.bin_size] = {
        "RD_Raw": wigFeatures[0],
        "RD_Raw_gc_coor": wigFeatures[1],
        "MeanShift": wigFeatures[2],
        "Combined": [],
        "BAF1": bafFeatures[0],
        "BAF2": bafFeatures[1]
      }
      this.rd_bins = [this.bin_size]
      this.available_callers = ["MeanShift"]
      this.set_available_callers()

    } else {
      this.cnvpytor_obj = new Read_HDF5.Read_HDF5(this.config.url, this.bin_size)

      this.wigFeatures_obj = await this.cnvpytor_obj.get_rd_signal(this.bin_size)
      this.rd_bins = this.cnvpytor_obj.rd_bins
      this.available_callers = this.cnvpytor_obj.callers
      this.set_available_callers()
    }

    this.tracks = []
    const p = []

    this.signals = this.get_signals()
    this.signal_colors = this.get_signal_colors()

    for (let bin_size in this.wigFeatures_obj) {
      let i = 0

      for (const [signal_name, wig] of Object.entries(this.wigFeatures_obj[bin_size])) {

        if (this.signals.includes(signal_name)) {
          let tconf = {};
          tconf.type = "wig"
          tconf.isMergedTrack = true
          tconf.features = wig
          tconf.name = signal_name
          tconf.color = this.signal_colors[i]
          const t = await this.browser.createTrack(tconf)
          if (t) {
            t.autoscale = false     // Scaling done from merged track
            this.tracks.push(t)
          } else {
            console.warn("Could not create track " + tconf)
          }

          if (typeof t.postInit === 'function') {
            p.push(t.postInit())
          }
          i++;
        }
      }

    }


    this.flipAxis = this.config.flipAxis ? this.config.flipAxis : false
    this.logScale = this.config.logScale ? this.config.logScale : false
    this.autoscale = this.config.autoscale
    if (!this.autoscale) {
      this.dataRange = {
        min: this.config.min || 0,
        max: this.config.max 
      }
    }
    for (let t of this.tracks) {
      t.autoscale = false
      t.dataRange = this.dataRange
    }
    
    return Promise.all(p)
  }
  set_available_callers(){
    if(!this.available_callers.includes(this.cnv_caller)){
      if (this.available_callers.length > 0){
       this.cnv_caller = this.available_callers[0]
      }else{
       this.cnv_caller = null
      }
     }
  }
  async getHeader() {

    if (!this.header) {
      if (typeof this.featureSource.getHeader === "function") {
        const header = await this.featureSource.getHeader()
        if (header) {
          this.callSets = header.callSets || []
        }
        this.header = header
      }
      this.sampleNames = this.callSets ? this.callSets.map(cs => cs.name) : []
    }

    return this.header
  }

  get height() {
    return this._height
  }

  set height(h) {
    this._height = h
    if (this.tracks) {
      for (let t of this.tracks) {
        t.height = h
        t.config.height = h
      }
    }
  }

  menuItemList() {
    let items = []

    if (this.flipAxis !== undefined) {
      items.push({
        label: "Flip y-axis",
        click: () => {
          this.flipAxis = !this.flipAxis
          this.trackView.repaintViews()
        }
      })
    }

    items = items.concat(MenuUtils.numericDataMenuItems(this.trackView))

    items.push('<hr/>')
    items.push("Bin Sizes")
    for (let rd_bin of this.rd_bins) {
      const checkBox = createCheckbox(rd_bin, rd_bin === this.bin_size)
      items.push({
        object: $(checkBox),
        click: async () => {
          this.bin_size = rd_bin

          await this.recreate_tracks(rd_bin)
          this.clearCachedFeatures()
          this.trackView.updateViews()
          this.trackView.repaintViews()
        }
      })
    }
    items.push('<hr/>')
    items.push("Signal Type")

    let signal_dct = { "rd_snp": "RD and BAF Likelihood", "rd": "RD Signal", "snp": "BAF Likelihood" }
    for (let signal_name in signal_dct) {
      const checkBox = createCheckbox(signal_dct[signal_name], signal_name === this.signal_name)
      items.push({
        object: $(checkBox),
        click: async () => {
          this.signal_name = signal_name
          await this.recreate_tracks(this.bin_size)
          this.clearCachedFeatures()
          this.trackView.updateViews()
          this.trackView.repaintViews()

        }
      })
    }

    // cnv caller setting
    items.push('<hr/>')
    items.push("CNV caller")
    for (let cnv_caller of this.available_callers)  {
      const checkBox = createCheckbox(cnv_caller, cnv_caller === this.cnv_caller)
      items.push({
        object: $(checkBox),
        click: async () => {
          this.cnv_caller = cnv_caller
          await this.recreate_tracks(this.bin_size)
          this.clearCachedFeatures()
          this.trackView.updateViews()
          this.trackView.repaintViews()
        }
      })
    }

    return items
  }

  async recreate_tracks(bin_size) {
    this.tracks = []
    const p = []
    
    if (!(bin_size in this.wigFeatures_obj)) {
      console.log(bin_size, ": not found")
      this.wigFeatures_obj = { ...this.wigFeatures_obj, ...await this.cnvpytor_obj.get_rd_signal(bin_size) }
      console.log(this.wigFeatures_obj)
    }

    this.signals = this.get_signals()
    this.signal_colors = this.get_signal_colors()

    let i = 0

    for (const [signal_name, wig] of Object.entries(this.wigFeatures_obj[bin_size])) {
      if (this.signals.includes(signal_name)) {
        let tconf = {};
        tconf.type = "wig"
        tconf.isMergedTrack = true
        tconf.features = wig
        tconf.name = signal_name
        tconf.color = this.signal_colors[i]
        const t = await this.browser.createTrack(tconf)
        if (t) {
          t.autoscale = false     // Scaling done from merged track
          this.tracks.push(t)
        } else {
          console.warn("Could not create track " + tconf)
        }

        if (typeof t.postInit === 'function') {
          p.push(t.postInit())
        }
        i++;
      }

    }


    this.flipAxis = this.config.flipAxis ? this.config.flipAxis : false
    this.logScale = this.config.logScale ? this.config.logScale : false
    this.autoscale = this.config.autoscale 
    if (!this.autoscale) {
      this.dataRange = {
        min: this.config.min || 0,
        max: this.config.max
      }
    }
    for (let t of this.tracks) {
      t.autoscale = false
      t.dataRange = this.dataRange
    }
    return Promise.all(p)
  }

  async getFeatures(chr, bpStart, bpEnd, bpPerPixel) {

    const promises = this.tracks.map((t) => t.getFeatures(chr, bpStart, bpEnd, bpPerPixel))
    return Promise.all(promises)
  }

  draw(options) {

    // const mergedFeatures = options.features    // Array of feature arrays, 1 for each track
    const mergedFeatures = options.features


    if (this.defaultScale){
      if (this.signal_name == 'rd_snp') {
        this.dataRange = {
          min: this.config.min || -2,
          max: this.config.max || 6
        }
      } else if(this.signal_name == 'rd'){
        this.dataRange = {
          min: this.config.min || 0,
          max: this.config.max || 6
        }
      } else if (this.signal_name == 'snp') {
        this.dataRange = {
          min: this.config.min || -2,
          max: this.config.max || 0
        }
      }
    }

    if (this.autoscale) {
      this.dataRange = autoscale(options.referenceFrame.chr, mergedFeatures)
    }

    for (let i = 0, len = this.tracks.length; i < len; i++) {
      const trackOptions = Object.assign({}, options)
      trackOptions.features = mergedFeatures[i]
      this.tracks[i].dataRange = this.dataRange
      this.tracks[i].flipAxis = this.flipAxis
      this.tracks[i].logScale = this.logScale
      if (this.graphType) {
        this.tracks[i].graphType = this.graphType
      }
      this.tracks[i].draw(trackOptions)
    }
  }

  popupData(clickState, features) {

    const featuresArray = features || clickState.viewport.cachedFeatures

    if (featuresArray && featuresArray.length === this.tracks.length) {
      // Array of feature arrays, 1 for each track
      const popupData = []
      for (let i = 0; i < this.tracks.length; i++) {
        if (i > 0) popupData.push('<hr/>')
        popupData.push(`<div style=background-color:rgb(245,245,245);border-bottom-style:dashed;border-bottom-width:1px;padding-bottom:5px;padding-top:10px;font-weight:bold;font-size:larger >${this.tracks[i].name}</div>`)
        const trackPopupData = this.tracks[i].popupData(clickState, featuresArray[i])
        popupData.push(...trackPopupData)

      }
      return popupData
    }
  }


  get supportsWholeGenome() {
    return this.tracks.every(track => track.supportsWholeGenome)
  }
}

function autoscale(chr, featureArrays) {

  let min = 0
  let max = -Number.MAX_VALUE
  for (let features of featureArrays) {
    for (let f of features) {
      if (typeof f.value !== 'undefined' && !Number.isNaN(f.value)) {
        min = Math.min(min, f.value)
        max = Math.max(max, f.value)
      }
    }
  }
  return { min: min, max: max }
}

export default cnvpytorTrack
