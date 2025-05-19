#!/usr/bin/env node

const fs = require('fs-extra');
fs.copySync(__dirname + '/../js/igv.d.ts', __dirname + '/../dist/igv.d.ts');
