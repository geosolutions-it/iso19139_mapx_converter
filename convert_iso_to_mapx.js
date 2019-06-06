// Converts an ISO19139 XML(xml2json) document in MAPX format
//
// Author: Emanuele Tajariol (GeoSolutions) <etj@geo-solutions.it>

const MAPX = require("./mapx");
const UTILS = require("./mapx_utils");

const ATTR_CLV = "codeListValue";
const MD_ROOT_NAME = 'MD_Metadata';
const GCO_CHAR_NAME = 'CharacterString';
const DATA_IDENT_NAME = 'MD_DataIdentification';
const SERV_IDENT_NAME = 'SRV_ServiceIdentification';
const CI_RP = "CI_ResponsibleParty";
const CI_CITATION = "CI_Citation";



const FREQ_D41_MAPPING= {
    "continual":    "3" ,
    "daily":        "3" ,
    "weekly":       "3" ,
    "fortnightly":  "3" ,
    "monthly":      "2" ,
    "quarterly":    "2" ,
    "biannually":   "2" ,
    "annually":     "2" ,
    "as_needed":    "1" ,
    "irregular" :   "1" ,
    "not_planned":  "0" ,
    "unknown":      "0"
};

const DATE_DEFAULT = "0001-01-01";


function iso19139_to_mapx(data, params) {

    var log = params ? params[UTILS.PARAM_LOG_INFO_NAME] : false;

    var mapx = MAPX.create_object();

    var mdRoot = undefined;
//        console.log("data[mdRootName] --> ", data[mdRootName])
//        console.log("data[0] --> ", data[0])
//        console.log("Object.keys(data) --> ", Object.keys(data))
//        console.log("data['GetRecordByIdResponse'] --> ", data['GetRecordByIdResponse'])

    if (data[MD_ROOT_NAME]) {
        if(log)
            console.log("Not unwrapping ", MD_ROOT_NAME);
        mdRoot = data[MD_ROOT_NAME];
    } else {
        rootName = Object.keys(data)[0];
        if (log)
            console.log("Unwrapping ", rootName);
        mdRoot = data[rootName][MD_ROOT_NAME][0];
    }

//    if(log)
//        console.log("ROOT IS ", mdRoot);

    // Look for some of the main nodes
    if(mdRoot['identificationInfo'] && mdRoot['identificationInfo'].length > 1) {
        console.warn("More than 1 identinfo found");
    }

    var identificationInfo = mdRoot['identificationInfo'][0];

    var dataIdent = identificationInfo[DATA_IDENT_NAME];
    var srvIdent = identificationInfo[SERV_IDENT_NAME];

    var identNode = dataIdent?
            dataIdent[0] :
            srvIdent[0];

    var dataCitationNode = getFirstFromPath(identNode, ["citation", CI_CITATION]);

    var uuid = getFirstFromPath(mdRoot, ["fileIdentifier", GCO_CHAR_NAME]);
    if(log)
        console.log("METADATA ID", uuid)

        
    // Detect language
    var lang;
    var isoLang = getFirstFromPath(identNode, ["language", GCO_CHAR_NAME]);
    if (isoLang) {
        if (isoLang.length == 2) {
            lang = isoLang;
        } else {
            lang = UTIL.LANG_MAPPING_I2M[isoLang];
        }

        if (!lang) {
            lang = "en"; // default language
            if(log)
                console.warn("Can't map language ", isoLang)
        }
        MAPX.add_language(mapx, lang);
    } else {
        lang = "en"; // default language
        if(log)
            console.warn("Language definition not found");
    }

//    if(log)
//        console.log("Language", lang)

    // === Title
    var title = getFirstFromPath(dataCitationNode, ["title", GCO_CHAR_NAME]);
    MAPX.set_title(mapx, lang, title);

    // === Abstract
    var abstract = getFirstFromPath(identNode, ["abstract", GCO_CHAR_NAME]);
    MAPX.set_abstract(mapx, lang, abstract);

    // === Keywords
    for (var dk of identNode["descriptiveKeywords"] || []) {
        for (var keywords of dk["MD_Keywords"]) {
            for (var keyword of keywords["keyword"]) {
                MAPX.add_keyword(mapx, keyword[GCO_CHAR_NAME][0])
            }
        }
    }

    var cat = getFirstFromPath(identNode, ["topicCategory", "MD_TopicCategoryCode"]);
    if (cat) {
        if(log)
            console.log("Category is ", cat);
        MAPX.add_keyword(mapx, cat);
    }

    // === Notes
    MAPX.add_note(mapx, lang, "PURPOSE", getFirstFromPath(identNode, ["purpose", GCO_CHAR_NAME]));
    MAPX.add_note(mapx, lang, "CREDIT", getFirstFromPath(identNode, ["credit", GCO_CHAR_NAME]));
    MAPX.add_note(mapx, lang, "ENVIRONMENT", getFirstFromPath(identNode, ["environmentDescription", GCO_CHAR_NAME]));
    MAPX.add_note(mapx, lang, "SUPPLEMENTAL INFO", getFirstFromPath(identNode, ["supplementalInformation", GCO_CHAR_NAME]));

    // add lineage and processing steps
    for(var qinfo of mdRoot["dataQualityInfo"]) {
        var lineage = getFirstFromPath(qinfo, ["DQ_DataQuality", "lineage", "LI_Lineage"]);
        if (lineage) {
        
            MAPX.add_note(mapx, lang, "LINEAGE", getFirstFromPath(lineage, ["statement", GCO_CHAR_NAME]));

            // add process steps
            // "processStep":[{"LI_ProcessStep":[{"description":[{"CharacterString":["detailed description of processing: deliverables 3.7 and 3.8 available at: http://www.envirogrids.net/index.php?option=com_content&view=article&id=23&Itemid=40"]}]
            if(lineage["processStep"]) {
                for(var pstep of lineage["processStep"]) {

                    var stepDescr = getFirstFromPath(pstep, ["LI_ProcessStep", "description", GCO_CHAR_NAME]);
                    var stepRatio = getFirstFromPath(pstep, ["LI_ProcessStep", "rationale", GCO_CHAR_NAME]);

                    var stepText =
                            (stepDescr ? "DESCRIPTION: " + stepDescr + "\n" : "") +
                            (stepRatio ? "RATIONALE: " + stepRatio + "\n" : "");

                    MAPX.add_note(mapx, lang, "PROCESSING STEP", stepText);
                }
            }
        }
    }


    // === Temporal
    // == Issuance

    // = Periodicity
    //
    // "resourceMaintenance":[{
    //      "MD_MaintenanceInformation":[
    //          {"maintenanceAndUpdateFrequency":[
    //              {"MD_MaintenanceFrequencyCode":[
    //                  {"$":{"codeListValue":"notPlanned",
    var isoFreqNode = getFirstFromPath(identNode, ["resourceMaintenance", "MD_MaintenanceInformation", "maintenanceAndUpdateFrequency", "MD_MaintenanceFrequencyCode"]);
    if (isoFreqNode) {
        var isoFreqVal = isoFreqNode["$"]["codeListValue"];

        var mapxFreq = UTIL.FREQ_MAPPING_I2M[isoFreqVal];
        MAPX.set_periodicity(mapx, mapxFreq ? mapxFreq : "unknown");
    }

    // Retrieve dates
    var datemap = {
        "creation": undefined,
        "publication": undefined,
        "revision": undefined};

    var datestamp = getFirstFromPath(mdRoot, ["dateStamp", "Date"]);
    var metadataDate = formatDate(datestamp, undefined);

    for( var date of dataCitationNode["date"] || []) {
        // console.log(JSON.stringify(date));
        // {"CI_Date":[{
        //      "date":[{
        //          "DateTime":["2012-04-24T13:52:00"]}],
        //      "dateType":[{
        //          "CI_DateTypeCode":[{"$":{"codeListValue":"publication"

        var typeNode = getFirstFromPath(date, [ "CI_Date", "dateType", "CI_DateTypeCode"]);
        var typeValue = typeNode["$"]["codeListValue"];

        var dateTimeVal = getFirstFromPath(date, [ "CI_Date", "date", "DateTime"]);
        var dateVal = getFirstFromPath(date, [ "CI_Date", "date", "Date"]);

        var mapxdate = formatDate(dateTimeVal, dateVal);

        datemap[typeValue] = mapxdate;
    }

    // = Released
    var releaseDate = getFirstDefined([
            datemap["publication"],
            datemap["creation"],
            metadataDate,
            DATE_DEFAULT]);

    // = Modified
    var updateDate = getFirstDefined([
            datemap["revision"],
            datemap["publication"],
            datemap["creation"],
            metadataDate,
            DATE_DEFAULT]);

    MAPX.set_release_date(mapx, releaseDate);
    MAPX.set_modified_date(mapx, updateDate);

    // == Range
    // "extent":[
    //      {"EX_Extent":[
    //          {"temporalElement":[
    //              {"EX_TemporalExtent":[
    //                  {"extent":[{"TimePeriod":[
    //                      {"$":{"gml:id":"d425e521a1052958"},
    //                      "beginPosition":["2040-01-03T00:00:00"],
    //                      "endPosition":["2040-01-02T00:00:00"]}]}]}]}]}]
    var timePeriod = findFirstFromPath(identNode, [ "extent", "EX_Extent", "temporalElement", "EX_TemporalExtent", "extent", "TimePeriod"]);
    if(timePeriod) {
        var optStart = timePeriod["beginPosition"];
        var optEnd = timePeriod["endPosition"];

        if(optStart) {
            MAPX.set_temporal_start(mapx, formatDate(optStart[0]));
        }
        if(optEnd) {
            MAPX.set_temporal_end(mapx, formatDate(optEnd[0]));
        }
    }

    // === Spatial

    // == CRS
    // "referenceSystemInfo":[
    //      {"MD_ReferenceSystem":[
    //          {"referenceSystemIdentifier":[
    //              {"RS_Identifier":[
    //                  {"code":[{"CharacterString":["ETRS89 / ETRS-LAEA (EPSG:3035)"]}],
    //                   "codeSpace":[{"CharacterString":["EPSG"]}],
    //                   "version":[{"CharacterString":["7.4"]}]}]}]}]}]

    var crsid = getFirstFromPath(mdRoot, [ "referenceSystemInfo", "MD_ReferenceSystem", "referenceSystemIdentifier", "RS_Identifier", "code", GCO_CHAR_NAME]);
    //console.log("CRS --> ", JSON.stringify(crsid));
    if(crsid) {
        var epsgcode = extractEpsgCode(crsid);
        if(epsgcode) {
            MAPX.set_crs(mapx, "EPSG:" + epsgcode, "http://spatialreference.org/ref/epsg/"+epsgcode+"/");
        } else {
            // copy it verbatim
            MAPX.set_crs(mapx, crsid, "http://spatialreference.org/ref/epsg/0/");
        }
    } else {
        // use the default
        console.warn("CRS not found");
    }

    // == BBOX
    // "extent":[{"EX_Extent":[{"geographicElement":[{"EX_GeographicBoundingBox":[{"westBoundLongitude":[{"Decimal":["7"]}],"eastBoundLongitude":[{"Decimal":["48.00000000000001"]}],"southBoundLatitude":[{"Decimal":["36"]}],"northBoundLatitude":[{"Decimal":["58.00000000000001"
    var geoextent = findFirstFromPath(identNode, ["extent", "EX_Extent", "geographicElement", "EX_GeographicBoundingBox"]);

    if(geoextent)
        MAPX.set_bbox(mapx,
            geoextent["westBoundLongitude"][0]["Decimal"][0],
            geoextent["eastBoundLongitude"][0]["Decimal"][0],
            geoextent["southBoundLatitude"][0]["Decimal"][0],
            geoextent["northBoundLatitude"][0]["Decimal"][0]
        );

    // === Contacts

    // add all metadata contacts
    addContacts(mapx, "Metadata ", mdRoot["contact"] || []);

    // add all data contacts
    addContacts(mapx, "Dataset ", identNode["pointOfContact"] || []);

    // === Origin

    // == Source
    //
    // "distributionInfo":[
    //      {"MD_Distribution":[
    //          {"transferOptions":[
    //              {"MD_DigitalTransferOptions":[
    //                  {"onLine":[
    //                      {"CI_OnlineResource":[
    //                          {"linkage":[
    //                              {"URL":["http://129.194.231.213:8080/geoserver/eg_scenarios/wms?service=WMS&version=1.3.0"]}],
    //                           "protocol":[{"CharacterString":["OGC:WMS-1.3.0-http-get-map"]}],
    //                           "name":[{"CharacterString":["hot2040"]}],
    //                           "description":[{"$":{"gco:nilReason":"missing"},"CharacterString":[""]}]}]},
    //                      {"CI_OnlineResource":[
    //                          {"linkage":[
    //                              {"$":{"xmlns:gmx":"http://www.isotc211.org/2005/gmx","xmlns:srv":"http://www.isotc211.org/2005/srv"},
    //                              "URL":["ftp://datastorage.grid.unep.ch/enviroGRIDS/Wp3/BSC_LU_hot.zip"]}],
    //                           "protocol":[{"CharacterString":["WWW:DOWNLOAD-1.0-ftp--download"]}],
    //                           "name":[
    //                              {"$":{"xmlns:gmx":"http://www.isotc211.org/2005/gmx","xmlns:srv":"http://www.isotc211.org/2005/srv"},
    //                              "MimeFileType":[{"_":"Data download","$":{"type":""}}]}],
    //                           "description":[{"$":{"gco:nilReason":"missing"},"CharacterString":[""]}]}]},
    //                      {"CI_OnlineResource":[
    //                          {"linkage":[
    //                              {"URL":["http://129.194.231.213:8080/geoserver/eg_scenarios/wcs?service=WCS&version=1.1.0"]}],
    //                           "protocol":[{"CharacterString":["OGC:WCS-1.1.0-http-get-capabilities"]}],
    //                           "name":[{"CharacterString":["hot2040"]}],
    //                           "description":[{"$":{"gco:nilReason":"missing"},"CharacterString":[""]}]}]}]}]},
    //              {"MD_DigitalTransferOptions":[
    //                  {"onLine":[
    //                      {"CI_OnlineResource":[
    //                          {"linkage":[
    //                              {"URL":["http://envirogrids.grid.unep.ch:8080/geonetwork/srv/en/resources.get?id=38&fname=HOT.zip&access=private"]}],
    //                           "protocol":[{"CharacterString":["WWW:DOWNLOAD-1.0-http--download"]}],
    //                           "name":[
    //                               {"MimeFileType":[
    //                                   {"_":"HOT.zip",
    //                                   "$":{"xmlns:gmx":"http://www.isotc211.org/2005/gmx","type":"application/zip"}}]}],
    //                           "description":[{"CharacterString":[""]}]}]}]}]}]}]}],

    var isOgc = false;

    var distributionNode = getFirstFromPath(mdRoot, [ "distributionInfo", "MD_Distribution"]);
    for(var transfOpt of distributionNode['transferOptions']) {
        for(var dto of transfOpt['MD_DigitalTransferOptions']) {
            for(var online of dto['onLine'] || []) {
                for(var onlineRes of online['CI_OnlineResource']) {
                    var link = onlineRes["linkage"][0];
                    var url = getFirstFromPath(link, ["URL"]);
                    var proto = getFirstFromPath(onlineRes, ["protocol", GCO_CHAR_NAME]);
                    var name = getFirstFromPath(onlineRes, ["name", GCO_CHAR_NAME]);

                    // lots of heuristic here
                    if(proto && proto.startsWith("OGC"))
                        isOgc = true;

                    var isDownload = (proto !== undefined) && proto.startsWith("WWW:DOWNLOAD");

                    if(proto && proto.endsWith("get-map"))
                        url = url + "&LAYER=" + name;

                    if(url.length > 0)
                        MAPX.add_source(mapx, url, isDownload);
                }
            }
        }
    }

    // === License

    addCostraints(mapx, mdRoot["metadataConstraints"], "Metadata");
    addCostraints(mapx, identNode["resourceConstraints"], "Dataset");

    // === Integrity

    //1_1: Does the data provider have the capacity to document the data and provide basic metadata (e.g.
    //name, coordinate system, year, update frequency, description, and methodology)?
    MAPX.set_integrity(mapx, 1,1, "1"); // we're populating the metadata from an existing ISO metadata

    //_2_4: string , x ∈ { "0" (default) , "1" , "2" , "3" }
    // Is the data compliant with applicable Open Geospatial Consortium standards, e.g. Web Map Service (WMS)?
    MAPX.set_integrity(mapx, 2,4, isOgc?"1":"0");

    //di_4_1: string , x ∈ { "0" (default) , "1" , "2" , "3" }
    // The data provider is able to maintain, update and publish it on a regular basis
    var i41 = FREQ_D41_MAPPING[MAPX.get_periodicity(mapx)];
    MAPX.set_integrity(mapx, 4,1, i41);

    return mapx;
}

const RP_INDIVIDUAL_NAME = "individualName";
const RP_POSITION_NAME = "positionName";
const RP_ORG_NAME = "organisationName";

const RP_CONTACT_INFO = "contactInfo";
const RP_CI_CONTACT = "CI_Contact";

const RP_PHONE = "phone";
const RP_CI_TELEPHONE = "CI_Telephone";

const RP_VOICE = "voice";
const RP_FAX = "facsimile";

const RP_ADDRESS = "address";
const RP_CI_ADDRESS = "CI_Address";
const RP_ADDR_DELIVERY = "deliveryPoint";
const RP_ADDR_CITY = "city";
const RP_ADDR_ADMINAREA = "administrativeArea";
const RP_ADDR_ZIP = "postalCode";
const RP_ADDR_COUNTRY = "country";
const RP_ADDR_EMAIL = "electronicMailAddress";

const RP_ROLE = "role";
const RP_CI_ROLECODE = "CI_RoleCode";

function parseResponsibleParty(rp) {

    rp_map = {}

    rp_map[RP_INDIVIDUAL_NAME] = getFirstFromPath(rp, [RP_INDIVIDUAL_NAME, GCO_CHAR_NAME]);
    rp_map[RP_POSITION_NAME] = getFirstFromPath(rp, [RP_POSITION_NAME, GCO_CHAR_NAME]);
    rp_map[RP_ORG_NAME] = getFirstFromPath(rp, [RP_ORG_NAME, GCO_CHAR_NAME]);

    var contactInfo = getFirstFromPath(rp, [RP_CONTACT_INFO, RP_CI_CONTACT]);

    if (contactInfo !== null) {

        var phone = getFirstFromPath(contactInfo, [RP_PHONE, RP_CI_TELEPHONE]);
        for (var field of [RP_VOICE, RP_FAX]) {
            rp_map[field] = getFirstFromPath(phone, [field, GCO_CHAR_NAME]);
        }

        var address = getFirstFromPath(contactInfo, [RP_ADDRESS, RP_CI_ADDRESS]);
        for (var field of [RP_ADDR_DELIVERY, RP_ADDR_CITY, RP_ADDR_ADMINAREA, RP_ADDR_ZIP, RP_ADDR_COUNTRY, RP_ADDR_EMAIL]) {
            rp_map[field] = getFirstFromPath(address, [field, GCO_CHAR_NAME]);
        }
    }

    // Extract role
    //"role":[{"CI_RoleCode":[{"$":{"codeListValue":"pointOfContact","codeList":"http://standa...
    var rolecode = getFirstFromPath(rp, [RP_ROLE, RP_CI_ROLECODE]);
    var roleValue = rolecode ? rolecode["$"][ATTR_CLV] : "unknown";
    rp_map[RP_ROLE] = roleValue;

    return rp_map;
}

function addContacts(mapx, context, isoContacts) {
    for (var isoContact of isoContacts) {
        var parsedContact = parseResponsibleParty(isoContact[CI_RP][0]);
        let [mfunc, mname, maddr, mmail] = mapContact(parsedContact);
        MAPX.add_contact(mapx, context + " " + mfunc, mname, maddr, mmail);
    }
}

function mapContact(parsedContact) {
    var names = [];
    names.push(parsedContact[RP_INDIVIDUAL_NAME]);
    names.push(parsedContact[RP_POSITION_NAME]);
    names.push(parsedContact[RP_ORG_NAME]);
    var retnames = names.join(", ");

    var addrs = [];
    if (parsedContact[RP_ADDR_DELIVERY])
        addrs.push("Address: " + parsedContact[RP_ADDR_DELIVERY]);
    if (parsedContact[RP_ADDR_CITY])
        addrs.push("City: " + parsedContact[RP_ADDR_CITY]);
    if (parsedContact[RP_ADDR_ADMINAREA])
        addrs.push("(" + parsedContact[RP_ADDR_ADMINAREA] + ")");
    if (parsedContact[RP_ADDR_ZIP])
        addrs.push("ZIP " + parsedContact[RP_ADDR_ZIP]);
    if (parsedContact[RP_ADDR_COUNTRY])
        addrs.push("Country: " + parsedContact[RP_ADDR_COUNTRY]);
    if (parsedContact[RP_VOICE])
        addrs.push("Phone: " + parsedContact[RP_VOICE]);
    if (parsedContact[RP_FAX])
        addrs.push("Fax: " + parsedContact[RP_FAX]);

    var retaddr = addrs.join(" - ");

    return [parsedContact[RP_ROLE], retnames, retaddr, parsedContact[RP_ADDR_EMAIL]];
}

function getFirstFromPath(m, path) {

    if (m === undefined)
        return undefined;

    var nodeset = m;

    for (var step of path) {
        var node = nodeset[step];
        if (node) {
            nodeset = node[0]; // take first node
        } else {
            return undefined;
        }
    }

    return nodeset;
}

function findFirstFromPath(nodeset, path, index) {

    if (nodeset === undefined)
        return undefined;

    if(index === undefined) // init index if not in params
        index = 0;

    var nodeName = path[index];

    if(nodeset[nodeName]) {
        if(index === path.length - 1)
            return nodeset[nodeName][0];
        else {
            for(var child of nodeset[nodeName]) {

                var found = findFirstFromPath(child, path, index + 1);
                if(found)
                    return found;
            }
        }
    }

    return undefined;
}

function getFirstDefined(valuesList) {

    for (var val of valuesList) {
        if(val)
            return val;
    }

    return undefined;
}

function formatDate(dateTime, date) {

    return dateTime ? dateTime.substring(0, 10) :
        date ? date.substring(0, 10) :
        DATE_DEFAULT;
}

function extractEpsgCode(crsid) {

    // some well known values
    if( crsid === "GCS_WGS_1984")
        return "4326";

    // some heuristic
    const RE = [
        /.*\(EPSG\:([0-9]+)\)/,
        /EPSG\:([0-9]+)/]

    for(re of RE) {
        var m = crsid.match(re);
        if(m) {
            return m[1];
        }
    }
    return undefined;
}

function addCostraints(mapx, constraintsList, context) {

    if(constraintsList === undefined) {
        return;
    }

    // "resourceConstraints":[
    //      {"MD_LegalConstraints":[
    //          {"accessConstraints":[
    //              {"MD_RestrictionCode":[
    //                  {"$":{"codeListValue":"license",}}]}],
    //           "useConstraints":[
    //              {"MD_RestrictionCode":[
    //                  {"$":{"codeListValue":"license",}}]}],
    //           "otherConstraints":[
    //              {"CharacterString":["The designations employed and the presentation of material on the maps do not imply the expression of any opinion whatsoever on the part of enviroGRIDS consortium concerning the legal status of any country, territory, city or area or of its authorities, or concerning the delimitation of its frontiers or boundaries."]},
    //              {"CharacterString":["This dataset was generated using regional dataset, it should not be used for local applications (such as land planning)."]},
    //              {"CharacterString":["The data can be downloaded and used for free for scientific and non-profit making purpose without any specific permission. We would, however, appreciate if the users let us know how this data was used and to receive a copy of any related publication, this in order to better identify the needs of the users. It is requested that the users cite the references accordingly in their publications."]}]}]}]

    for(var constraints of constraintsList || []) {
        for(var c of constraints["MD_Constraints"] || []) {
            for(var ul of c["useLimitation"]) {
                for(var text of ul[GCO_CHAR_NAME]) {
                    MAPX.add_license(mapx, context + " generic use limitation", text);
                }
            }
        }

        for(var c of constraints["MD_LegalConstraints"] || []) {
            for(var ul of c["useLimitation"] || []) {
                for(var text of ul[GCO_CHAR_NAME]) {
                    MAPX.add_license(mapx, context + " legal use limitation", text);
                }
            }
            for(var acc of c["accessConstraints"] || []) {
                var code = acc["MD_RestrictionCode"][0]["$"]["codeListValue"]
                MAPX.add_license(mapx, context + " legal access constraint", code);
            }
            for(var acc of c["useConstraints"] || []) {
                var code = acc["MD_RestrictionCode"][0]["$"]["codeListValue"]
                MAPX.add_license(mapx, context + " legal use constraint", code);
            }
            for(var acc of c["otherConstraints"] || []) {
                for(var text of acc[GCO_CHAR_NAME] || []) {
                    MAPX.add_license(mapx, context + " other legal constraint", text);
                }
            }
        }

        for(var c of constraints["MD_SecurityConstraints"] || []) {
            var classification = getFirstFromPath(c, ["classification", "MD_ClassificationCode"]);
            var ccode = classification["$"]["codeListValue"];

            var note = getFirstFromPath(c, ["userNote", GCO_CHAR_NAME]);
            var csys = getFirstFromPath(c, ["classificationSystem", GCO_CHAR_NAME]);
            var hand = getFirstFromPath(c, ["handlingDescription", GCO_CHAR_NAME]);

            var textList = [];
            if(note) textList.push("Note: " + note);
            if(csys) textList.push("Classification system: " + csys);
            if(hand) textList.push("Handling description: " + hand);

            MAPX.add_license(mapx, context + " security constraints: " + ccode, textList.join("\n\n"));
        }
    }

}

module.exports = {
        iso19139_to_mapx
};
