// Converts a MAPX object into a ISO19139 document (json format)
//
// Author: Emanuele Tajariol (GeoSolutions) <etj@geo-solutions.it>

import * as MAPX from "./mapx.js";
import * as UTILS from "./mapx_utils.js";

import MD5 from "crypto-md5/md5.js";
import builder from "xmlbuilder";


export function mapx_to_iso19139_t_t(mapx_text) {
    var mapx =  JSON.parse(mapx_text);
    var iso = mapx_to_iso19139(mapx, null);
    var isoxml = builder.create(iso, { encoding: 'utf-8' });
    var isotext = isoxml.end({ pretty: true }); 
    return isotext;
}

export function mapx_to_iso19139(mapx, params) {

    //  var log = params ? params[UTILS.PARAM_LOG_INFO_NAME] : false;

    var fileIdentifier = "TODO";
    var lang = "en"; // TODO

    var metadata = {};
    metadata["@xmlns:gmd"] = "http://www.isotc211.org/2005/gmd";
    metadata["@xmlns:gco"] = "http://www.isotc211.org/2005/gco";
    metadata["@xmlns:gml"] = "http://www.opengis.net/gml";

    metadata["gmd:fileIdentifier"] = {"gco:CharacterString": fileIdentifier};
    metadata["gmd:language"] = {"gco:CharacterString": lang};

    var metadata_contacts = [];
    var data_contacts = [];

    for(var c of MAPX.get_contacts(mapx)) {
        var f = c["function"];
        if(f.toLowerCase().includes('metadata')) {
            metadata_contacts.push(createResponsibleParty(c));
        } else {
            data_contacts.push(createResponsibleParty(c));
        }
    }

    metadata["gmd:contact"] = metadata_contacts;

    // current date
    metadata["gmd:dateStamp"] = {"gco:Date": new Date().toISOString()};

    // crs
    metadata["gmd:referenceSystemInfo"] =
            {"gmd:MD_ReferenceSystem" :
                {"gmd:referenceSystemIdentifier":
                    {"gmd:RS_Identifier":
                        {"gmd:code":
                            {"gco:CharacterString": MAPX.get_crs_code(mapx)}}}}};

    var dates = [];
    if(MAPX.exist_release_date(mapx)) {
        dates.push({"gmd:CI_Date":
                        {"gmd:date":
                            // modified date --> dataset
                            {"gco:Date" : MAPX.get_release_date(mapx)},
                        "gmd:dateType":
                            {"gmd:CI_DateTypeCode":
                                { "@codeListValue":"publication",
                                  "@codeList": "http://standards.iso.org/ittf/PubliclyAvailableStandards/ISO_19139_Schemas/resources/codelist/ML_gmxCodelists.xml#CI_DateTypeCode"}}
                        }
                    });
    }

    if(MAPX.exist_modified_date(mapx) &&
            (! MAPX.exist_release_date(mapx) ||
                ( MAPX.get_modified_date(mapx) != MAPX.get_release_date(mapx)))) {

        dates.push({"gmd:CI_Date":
                        {"gmd:date":
                            // modified date --> dataset
                            {"gco:Date" : MAPX.get_modified_date(mapx)},
                        "gmd:dateType":
                            {"gmd:CI_DateTypeCode":
                                { "@codeListValue":"revision",
                                  "@codeList": "http://standards.iso.org/ittf/PubliclyAvailableStandards/ISO_19139_Schemas/resources/codelist/ML_gmxCodelists.xml#CI_DateTypeCode"}}
                        }
                    });
    }

    var identification = {};
    identification["gmd:citation"] =
        {"gmd:CI_Citation":
            // title
            {"gmd:title":
                {"gco:CharacterString": MAPX.get_title(mapx,lang)},
             "gmd:date": dates
            }
        };

    // abstract
    identification["gmd:abstract"] = {"gco:CharacterString" : MAPX.get_abstract(mapx, lang)};

    // data points of concat
    identification["gmd:pointOfContact"] = data_contacts;

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
        var txt;
        for(var l of licenses) {
            if(l["name"]) {
                txt = l["name"] + ": " + l["text"];
            } else {
                txt = l["text"];
            }
            oc.push({"gco:CharacterString": txt});
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

    var extents = [];

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
        var period = {};
        period["@gml:id"] = "missing";

        var add_extent = false;

        if(MAPX.exist_temporal_start(mapx)) {
            period["gml:beginPosition"] =  MAPX.get_temporal_start(mapx);
            add_extent = true;
        }
        if(MAPX.exist_temporal_end(mapx)) {
            period["gml:endPosition"] =  MAPX.get_temporal_end(mapx);
            add_extent = true;
        }

        if(add_extent) {
            extents.push(
                {"gmd:EX_Extent":
                    {"gmd:temporalElement":
                        {"gmd:EX_TemporalExtent":
                            {"gmd:extent":
                                {"gml:TimePeriod": period}
                            }
                        }
                    }
                }
            );
        }
    }

    identification["gmd:extent"] = extents;

    // supplementalinfo
    var note = MAPX.get_notes(mapx, lang);
    if(note) {
        identification["gmd:supplementalInformation"] = {"gco:CharacterString": note};
    }

    metadata["gmd:identificationInfo"] = {"gmd:MD_DataIdentification": identification};

    var resources = [];

    // sources
    var sources = MAPX.get_sources(mapx);
    if(sources.length > 0) {

        for(var source of sources) {
            resources.push(
                    {"gmd:CI_OnlineResource":
                        {"gmd:linkage":
                            {"gmd:URL": source["url"] },
                        "gmd:name":
                            {"gco:CharacterString": source["is_download_link"]?"Downloadable resource":"Other resource"}
                        }
                    }
            );
        }
    }

    // annexes
    var annexes = MAPX.get_references(mapx);
    if(annexes.length > 0) {

        for(var annex of annexes) {
            resources.push(
                    {"gmd:CI_OnlineResource":
                        {"gmd:linkage":
                            {"gmd:URL": annex },
                        "gmd:name":
                            {"gco:CharacterString": "Annex"}
                        }
                    }
            );
        }
    }

    if(MAPX.get_homepage(mapx)) {
        resources.push(
                {"gmd:CI_OnlineResource":
                    {"gmd:linkage":
                        {"gmd:URL": MAPX.get_homepage(mapx) },
                    "gmd:name":
                        {"gco:CharacterString": "Homepage"}
                    }
                }
        );
    }

    if(resources.length > 0) {
        metadata["gmd:distributionInfo"] =
            {"gmd:MD_Distribution":
                {"gmd:transferOptions":
                    {"gmd:MD_DigitalTransferOptions":
                        {"gmd:onLine": resources}
                    }
                }
            };
    }


    // create an UUID on the hash of all the fields stored so far
    var uuid = MD5(JSON.stringify(metadata), 'hex');
    metadata["gmd:fileIdentifier"] = {"gco:CharacterString": uuid};

    var root = { "gmd:MD_Metadata": metadata };
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

