/*
 */

const MAPX = require("./mapx");
const UTILS = require("./mapx_utils");

var md5 = require('md5');

const NS = "@xmlns";
const NS_GMD = "http://www.isotc211.org/2005/gmd";
const NS_GCO = "http://www.isotc211.org/2005/gco";
const NS_GML = "http://www.opengis.net/gml";

function mapx_to_iso19139(mapx, params) {

    var log = params ? params[UTILS.PARAM_LOG_INFO_NAME] : false;

    var fileIdentifier = "TODO";
    var lang = "en"; // TODO

    var metadata = {};
    metadata["@xmlns:gmd"] = "http://www.isotc211.org/2005/gmd";
    metadata["@xmlns:gco"] = "http://www.isotc211.org/2005/gco"

    metadata["gmd:fileIdentifier"] = {"gco:CharacterString": fileIdentifier};
    metadata["gmd:language"] = {"gco:CharacterString": lang};

    contacts = []
    for(var c of MAPX.get_contacts(mapx)) {
        contacts.push(createResponsibleParty(c));
    }
    metadata["gmd:contact"] = contacts;

    // release date --> metadata
    metadata["gmd:dateStamp"] = {"gco:DateTime": MAPX.get_release_date(mapx)};

    // crs
    metadata["gmd:referenceSystemInfo"] =
            {"gmd:MD_ReferenceSystem" :
                {"gmd:referenceSystemIdentifier":
                    {"gmd:RS_Identifier":
                        {"gmd:code":
                            {"gco:CharacterString": MAPX.get_crs_code(mapx)}}}}};

    // gather keywords
    var keywordList = [];
    for(var kw of MAPX.get_keywords(mapx)) {
        keywordList.push({"gmd:keyword": {"gco:CharacterString": kw}});
    }
  
    metadata["gmd:identificationInfo"] =
            {"gmd:MD_DataIdentification":
                {"gmd:citation":
                    {"gmd:CI_Citation":
                        // title
                        {"gmd:title":
                            {"gco:CharacterString": MAPX.get_title(mapx,lang)},
                        "gmd:date":
                            {"gmd:CI_Date":
                                {"gmd:date":
                                    // modified date --> dataset
                                    {"gco:DateTime" : MAPX.get_modified_date(mapx)},
                                "gmd:dateType":
                                    {"gmd:CI_DateTypeCode":
                                        { "@codeListValue":"revision",
                                          "@codeList": "http://standards.iso.org/ittf/PubliclyAvailableStandards/ISO_19139_Schemas/resources/codelist/ML_gmxCodelists.xml#CI_DateTypeCode"}}
                                }
                            }
                        }
                    },
                // abstract
                "gmd:abstract":
                    {"gco:CharacterString" : MAPX.get_abstract(mapx, lang)}
                },
                // frequency
                "gmd:resourceMaintenance" :
                    {"gmd:MD_MaintenanceInformation":
                        {"gmd:maintenanceAndUpdateFrequency":
                            {"gmd:MD_MaintenanceFrequencyCode":
                                {"@codeListValue": UTILS.FREQ_MAPPING_M2I[MAPX.get_periodicity(mapx)],
                                 "@codeList" :"http://standards.iso.org/ittf/PubliclyAvailableStandards/ISO_19139_Schemas/resources/codelist/ML_gmxCodelists.xml#MD_MaintenanceFrequencyCode"}
                            }
                        }
                    },
                "gmd:descriptiveKeywords" : 
                    {"gmd:MD_Keywords": keywordList}
            };


    // supplementalinfo

    // temporal

    // bbox

    // sources

    // licenses

    // references


    // create an UUID on the hash of all the fields stored so far
    var uuid = md5(JSON.stringify(metadata));
    metadata["gmd:fileIdentifier"] = {"gco:CharacterString": uuid};

    var root = { "gmd:MD_Metadata": metadata }
    return root;
}

function createResponsibleParty(c) {

    var func = c["function"];
    var name = c["name"];
    var addr = c["address"];
    var mail = c["email"];

    return {
        "gmd:CI_ResponsibleParty" :
            {
            "gmd:individualName":{"gco:CharacterString": name},
            "gmd:positionName":{"gco:CharacterString": func},
            "gmd:contactInfo":{
                "gmd:CI_Contact":{
                    "gmd:address":{
                        "gmd:CI_Address":{
                            "gmd:deliveryPoint":{"gco:CharacterString": addr},
                            "gmd:electronicMailAddress": {"gco:CharacterString": mail}}}
                }},
            "gmd:role":{
                "gmd:CI_RoleCode":{
                    "@codeList":"http://standards.iso.org/ittf/PubliclyAvailableStandards/ISO_19139_Schemas/resources/codelist/ML_gmxCodelists.xml#CI_RoleCode",
                    "@codeListValue":"pointOfContact"}}}
    };
}

module.exports = {
    mapx_to_iso19139
};

