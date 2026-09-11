#!/usr/bin/env node

/**
 * Watch css/**.scss and regenerate css/igv.css + js/embedCss.js on change.
 * Run: npm run watch:css
 */

const {execFileSync} = require('child_process')
const fs = require('fs')
const path = require('path')

const CSS_DIR = path.resolve(__dirname, '..', 'css')

function rebuild() {
    try {
        execFileSync(process.execPath, [path.join(__dirname, 'compileSass.cjs')], {stdio: 'inherit'})
        execFileSync(process.execPath, [path.join(__dirname, 'generateEmbedCss.js')], {stdio: 'inherit'})
        console.log(`[watch:css] rebuilt at ${new Date().toLocaleTimeString()}`)
    } catch (e) {
        // Report and keep watching -- a SASS syntax error shouldn't kill the watcher
        console.error('[watch:css] build failed, waiting for next change')
    }
}

let timer
fs.watch(CSS_DIR, {recursive: true}, (eventType, filename) => {
    if (!filename || !filename.endsWith('.scss')) return
    clearTimeout(timer)           // debounce -- editors emit several events per save
    timer = setTimeout(rebuild, 50)
})

rebuild()
console.log(`[watch:css] watching ${CSS_DIR}`)
