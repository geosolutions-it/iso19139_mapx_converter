// Load a remote ISO19139 document and transforms it into a MAPX json
// 
// Author: Emanuele Tajariol (GeoSolutions) <etj@geo-solutions.it>

const iso2mapx = require("./convert_iso_to_mapx");

const UTILS = require("./mapx_utils");

const xml2js = require('xml2js');
const request = require('request');
const fs = require("fs");


// ===== Parse arguments 

args = [];

var params = {};
params[UTILS.PARAM_LOG_INFO_NAME] = false;
params[UTILS.PARAM_LOG_DEBUG_NAME] = false;

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

const log_info = params[UTILS.PARAM_LOG_INFO_NAME];
const log_debug = params[UTILS.PARAM_LOG_DEBUG_NAME] || log_info;

run(source, destination, params)


async function run(source, destination, params) {

    var xml = source.startsWith("http") ?
        await loadFromUrl(source) :
        loadFromFile(source);

    if(xml) {

        xml2js.parseString(
            xml,
            {
                tagNameProcessors: [xml2js.processors.stripPrefix]
            },
            function (error, json) {
                if (error === null) {
                    
                    if(log_debug)
                        console.log("METADATA as JSON", JSON.stringify(json));

                    if (log_info) 
                        console.log("PARSING ISO19139 into MAPX");

                    mapx = iso2mapx.iso19139_to_mapx(json, params);

                    fs.writeFile(destination, JSON.stringify(mapx, null, 3), (err) => {
                        if (err) 
                            console.log(err);
                        else
                            console.log("Successfully Written to File ", destination);
                    });

                } else {
                    console.error(error);
                    console.log(xml);
                    return;
                }
            }
        );    
    } else {

        console.log("Error in getting ISO document");
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
      return fs.readFileSync(url);      
    } catch (err) {
        console.warn("Error while reading file". err);
        return undefined;
    }            
}

function usage() {
    console.log("loadISO [-v] URL destination_file");
}