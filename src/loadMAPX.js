// Load a MAPX json document and transforms it into an ISO19139 XML
//
// Author: Emanuele Tajariol (GeoSolutions) <etj@geo-solutions.it>

import * as m2i from './convert_mapx_to_iso.js'
import * as UTILS from './mapx_utils.js'

import * as fs from 'fs'

import builder from 'xmlbuilder'

// ===== Parse arguments

var args = []
var params = {}

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
params[UTILS.PARAM_HOMEPAGE_TEMPLATE_NAME] = args[2]

const logInfo = params[UTILS.PARAM_LOG_INFO_NAME]
const logDebug = params[UTILS.PARAM_LOG_DEBUG_NAME] || logInfo

if (logInfo) { console.log('Params --> ' + JSON.stringify(params)) }

run(source, destination, params)

async function run (source, destination, params) {
  var json = loadFromFile(source)

  if (json) {
    if (logDebug) { console.log('METADATA as JSON', json) }

    if (logInfo) { console.log('PARSING MAPX into ISO') }

    var xmlFormatted = m2i.mapxToIso19139(json)

    if (logDebug) { console.log('METADATA as XML', xmlFormatted) }

    fs.writeFile(destination, xmlFormatted, (err) => {
      if (err) { console.log(err) } else { console.log('Successfully Written to File ', destination) }
    })
  } else {
    console.log('No JSON data found')
  }
}

function loadFromFile (url) {
  try {
    return fs.readFileSync(url).toString()
  } catch (err) {
    console.warn('Error while reading file'.err)
    return undefined
  }
}

function usage () {
  console.log('loadMAPX [-v[v]] INPUT OUTPUT')
}
