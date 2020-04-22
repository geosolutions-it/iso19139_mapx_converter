// Load a remote ISO19139 document and transforms it into a MAPX json
// 
// Author: Emanuele Tajariol (GeoSolutions) <etj@geo-solutions.it>

import * as iso2mapx from "./convert_iso_to_mapx.js";
import * as UTILS from "./mapx_utils.js";

import xml2js from "xml2js";
import * as fs from "fs";


// ===== Parse arguments 

var args = [];

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

run(source, destination, params);


function run(source, destination, params) {
    var xml_text = loadFromFile(source);
    var mapx_text = iso2mapx.iso19139_to_mapx_t_t(xml_text);
    
    fs.writeFile(destination, mapx_text, (err) => {
        if (err) 
            console.log(err);
        else
            console.log("Successfully Written to File ", destination);
    });
}
    

function run_OLD(source, destination, params) {

    var xml = loadFromFile(source);

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

                    var mapx = iso2mapx.iso19139_to_mapx(json, params);

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