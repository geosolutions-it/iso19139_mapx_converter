// Converts a MAPX object into a ISO19139 document (json format)
//
// Author: Emanuele Tajariol (GeoSolutions) <etj@geo-solutions.it>

const MAPX = require("./mapx");
const UTILS = require("./mapx_utils");

var md5 = require('md5');

function mapx_to_iso19139(mapx, params) {

    var log = params ? params[UTILS.PARAM_LOG_INFO_NAME] : false;

    var fileIdentifier = "TODO";
    var lang = "en"; // TODO

    var metadata = {};
    metadata["@xmlns:gmd"] = "http://www.isotc211.org/2005/gmd";
    metadata["@xmlns:gco"] = "http://www.isotc211.org/2005/gco";
    metadata["@xmlns:gml"] = "http://www.opengis.net/gml";

    metadata["gmd:fileIdentifier"] = {"gco:CharacterString": fileIdentifier};
    metadata["gmd:language"] = {"gco:CharacterString": lang};

    contacts = []
    for(var c of MAPX.get_contacts(mapx)) {
        contacts.push(createResponsibleParty(c));
    }
    metadata["gmd:contact"] = contacts;

    // release date --> metadata
    metadata["gmd:dateStamp"] = {"gco:Date": MAPX.get_release_date(mapx)};

    // crs
    metadata["gmd:referenceSystemInfo"] =
            {"gmd:MD_ReferenceSystem" :
                {"gmd:referenceSystemIdentifier":
                    {"gmd:RS_Identifier":
                        {"gmd:code":
                            {"gco:CharacterString": MAPX.get_crs_code(mapx)}}}}};


    var identification = {};
    identification["gmd:citation"] =
        {"gmd:CI_Citation":
            // title
            {"gmd:title":
                {"gco:CharacterString": MAPX.get_title(mapx,lang)},
            "gmd:date":
                {"gmd:CI_Date":
                    {"gmd:date":
                        // modified date --> dataset
                        {"gco:Date" : MAPX.get_modified_date(mapx)},
                    "gmd:dateType":
                        {"gmd:CI_DateTypeCode":
                            { "@codeListValue":"revision",
                              "@codeList": "http://standards.iso.org/ittf/PubliclyAvailableStandards/ISO_19139_Schemas/resources/codelist/ML_gmxCodelists.xml#CI_DateTypeCode"}}
                    }
                }
            }
        };

    // abstract
    identification["gmd:abstract"] = {"gco:CharacterString" : MAPX.get_abstract(mapx, lang)};

    // frequency
    identification["gmd:resourceMaintenance"] =
        {"gmd:MD_MaintenanceInformation":
            {"gmd:maintenanceAndUpdateFrequency":
                {"gmd:MD_MaintenanceFrequencyCode":
                    {"@codeListValue": UTILS.FREQ_MAPPING_M2I[MAPX.get_periodicity(mapx)],
                     "@codeList" :"http://standards.iso.org/ittf/PubliclyAvailableStandards/ISO_19139_Schemas/resources/codelist/ML_gmxCodelists.xml#MD_MaintenanceFrequencyCode"}
                }
            }
        };

    // gather keywords
    var keywordList = [];
    for(var kw of MAPX.get_keywords(mapx)) {
        keywordList.push({"gco:CharacterString": kw});
    }

    if(keywordList.length > 0) {
        identification["gmd:descriptiveKeywords"] = {"gmd:MD_Keywords": {"gmd:keyword": keywordList}};
    }


    // licenses
    // gmd:resourceConstraints 0..N
    var licenses = MAPX.get_licenses(mapx);
    if(licenses.length > 0) {
        var oc = [];
        for(var l of licenses) {
            oc.push({"gco:CharacterString": l["name"] + ": " + l["text"]});
        }
        identification["gmd:resourceConstraints"] =
            {"gmd:MD_LegalConstraints":
                {"gmd:accessConstraints":
                    {"gmd:MD_RestrictionCode":
                        {"@codeListValue":"otherRestrictions",
                         "@codeList": "http://standards.iso.org/ittf/PubliclyAvailableStandards/ISO_19139_Schemas/resources/codelist/ML_gmxCodelists.xml#MD_RestrictionCode"
                        }
                    },
                 "gmd:otherConstraints": oc
                }
            };
    }

    var extents = []

    // bbox
    var [x0,x1,y0,y1] = MAPX.get_bbox(mapx);
    extents.push(
        {"gmd:EX_Extent":
            {"gmd:geographicElement":
                {"gmd:EX_GeographicBoundingBox":
                    {"gmd:westBoundLongitude": {"gco:Decimal": x0},
                    "gmd:eastBoundLongitude": {"gco:Decimal": x1},
                    "gmd:southBoundLatitude": {"gco:Decimal": y0},
                    "gmd:northBoundLatitude": {"gco:Decimal": y1}
                    }
                }
            }
        }
    );

    // temporal
    if(! MAPX.is_timeless(mapx)) {
        extents.push(
            {"gmd:EX_Extent":
                {"gmd:temporalElement":
                    {"gmd:EX_TemporalExtent":
                        {"gmd:extent":
                            {"gml:TimePeriod":
                                {"@gml:id" : "missing",
                                "gml:beginPosition": MAPX.get_temporal_start(mapx),
                                "gml:endPosition": MAPX.get_temporal_end(mapx)
                                }
                            }
                        }
                    }
                }
            }
        );
    }

    identification["gmd:extent"] = extents;

    // supplementalinfo
    var note = MAPX.get_notes(mapx, lang);
    if(note) {
        identification["gmd:supplementalInformation"] = {"gco:CharacterString": note};
    }

    metadata["gmd:identificationInfo"] = {"gmd:MD_DataIdentification": identification};

    // sources
    var sources = MAPX.get_sources(mapx);
    if(sources.length > 0) {
        var resources = [];

        for(var source of sources) {
            resources.push(
                    {"gmd:CI_OnlineResource":
                        {"gmd:linkage":
                            {"gmd:URL": source["url"] },
                        "gmd:description":
                            {"gco:CharacterString": source["is_download_link"]?"Downloadable resource":"Other resource"}
                        }
                    }
            )
        }

        metadata["gmd:distributionInfo"] =
            {"gmd:MD_Distribution":
                {"gmd:transferOptions":
                    {"gmd:MD_DigitalTransferOptions":
                        {"gmd:onLine": resources}
                    }
                }
            };
    }


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

