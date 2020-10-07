// Load a remote ISO19139 document and transforms it into a MAPX json
//
// Author: Emanuele Tajariol (GeoSolutions) <etj@geo-solutions.it>

import * as iso2mapx from './convert_iso_to_mapx.js'
import * as UTILS from './mapx_utils.js'

import * as fs from 'fs'

// ===== Parse arguments

var args = []

var params = {}
params[UTILS.PARAM_LOG_INFO_NAME] = false
params[UTILS.PARAM_LOG_DEBUG_NAME] = false

for (let j = 2; j < process.argv.length; j++) {
    var arg = process.argv[j]
    if (arg === '-v') {
        params[UTILS.PARAM_LOG_INFO_NAME] = true
    } else if (arg === '-vv') {
        params[UTILS.PARAM_LOG_DEBUG_NAME] = true
    } else {
        args.push(arg)
    }
}

if (args.length < 2) {
    usage()
    throw new Error('Missing arguments')
}

var source = args[0]
var destination = args[1]

// const logInfo = params[UTILS.PARAM_LOG_INFO_NAME]
// const logDebug = params[UTILS.PARAM_LOG_DEBUG_NAME] || logInfo

run(source, destination, params)

function run(source, destination, params) {
    var xmlText = loadFromFile(source)
    var mapxText = iso2mapx.iso19139ToMapx(xmlText, params)

    fs.writeFile(destination, mapxText, (err) => {
        if (err) {
            console.log(err)
        } else {
            console.log('Successfully Written to File ', destination)
        }
    })
}

function loadFromFile(url) {
    try {
        return fs.readFileSync(url)
    } catch (err) {
        console.warn('Error while reading file'.err)
        return undefined
    }
}

function usage() {
    console.log('loadISO [-v] URL destination_file')
}