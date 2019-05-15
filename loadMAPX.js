// Load a MAPX json document and transforms it into an ISO19139 XML
// 
// Author: Emanuele Tajariol (GeoSolutions) <etj@geo-solutions.it>

const m2i = require("./convert_mapx_to_iso");
const UTILS = require("./mapx_utils");

const builder = require('xmlbuilder');
const xml2js = require('xml2js');
const request = require('request');
const fs = require("fs");


// ===== Parse arguments 

args = [];

var params = {};

for (let j = 2; j < process.argv.length; j++) {  
    var arg = process.argv[j];
    if(arg === '-v') {        
        params[UTILS.PARAM_LOG_INFO_NAME] = true;
    } else if (arg === '-vv') {        
        params[UTILS.PARAM_LOG_DEBUG_NAME] = true;
    } else {
        args.push(arg);
    }
}

if(args.length < 2) {
    usage();
    throw("Missing arguments");
} 

var source = args[0];
var destination = args[1];
params[UTILS.PARAM_HOMEPAGE_TEMPLATE_NAME] = args[2];

const log_info = params[UTILS.PARAM_LOG_INFO_NAME];
const log_debug = params[UTILS.PARAM_LOG_DEBUG_NAME] || log_info;

if(log_info)
    console.log("Params --> " + JSON.stringify(params));

run(source, destination, params)


async function run(source, destination, params) {

    var json = source.startsWith("http") ?
        await loadFromUrl(source) :
        loadFromFile(source);

    if(json) {
        if(log_debug)
            console.log("METADATA as JSON", json);

        if (log_info) 
            console.log("PARSING MAPX into ISO");
                
        var mapx = JSON.parse(json);
        var iso = m2i.mapx_to_iso19139(mapx);
        
        if(log_debug)
            console.log("METADATA as ISO/JSON", JSON.stringify(iso));
        
        var xml = builder.create(iso, { encoding: 'utf-8' })
        var xmlFormatted = xml.end({ pretty: true });

        if(log_debug)
            console.log("METADATA as XML", xmlFormatted);
        
        fs.writeFile(destination, xmlFormatted, (err) => {
            if (err) 
                console.log(err);
            else
                console.log("Successfully Written to File ", destination);
        });
    } else {
        console.log("No JSON data found");
    }
}


async function loadFromUrl(url) {

    try {
        return await downloadUrl(url);
        
    } catch (error) {
        console.error('ERROR:');
        console.error(error);
    }
}


function downloadUrl(url) {
    return new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
            if (error) reject(error);
            if (response.statusCode != 200) {
                reject('Invalid status code <' + response.statusCode + '>');
            }
            resolve(body);
        });
    });
}

function loadFromFile(url) {
    try {
      return fs.readFileSync(url).toString();
    } catch (err) {
        console.warn("Error while reading file". err);
        return undefined;
    }            
}

function usage() {
    console.log("loadMAPX [-v[v]] INPUT OUTPUT");
}