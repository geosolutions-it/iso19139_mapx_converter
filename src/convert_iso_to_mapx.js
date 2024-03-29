// Converts an ISO19139 XML(xml2json) document in MAPX format
//
// Author: Emanuele Tajariol (GeoSolutions) <etj@geo-solutions.it>

import xml2js from 'xml2js'

import * as MAPX from './mapx.js'
import * as UTILS from './mapx_utils.js'

const ATTR_CLV = 'codeListValue'
const MD_ROOT_NAME = 'MD_Metadata'
const GCO_CHAR_NAME = 'CharacterString'
const DATA_IDENT_NAME = 'MD_DataIdentification'
const SERV_IDENT_NAME = 'SRV_ServiceIdentification'
const CI_RP = 'CI_ResponsibleParty'
const CI_CITATION = 'CI_Citation'

const DATE_DEFAULT = '0001-01-01'


/**
 * Transforms an ISO19139 xml text into a MAPX json text.
 *
 * @param {string} isostring - an iso19139 XML string
 * @param {obj} params - misc params to the function:
 *  - MESSAGE_HANDLER: class handling logging and collecting messages
 *
 * @returns {string} - a MAPX object as json string
 */
export function iso19139ToMapx(isostring, params = null) {

    var logger = createLogger(params)

    var isojson = xml2json(isostring, logger)
    if (!isojson) {
        logger.warn("Could not parse XML document, skipping mapx creation")
        return null
    }
    var mapx = iso19139ToMapxInternal(isojson, params)
    if (mapx) {
        var mapxobj = mapx.mapx
        var mapxstring = JSON.stringify(mapxobj, null, 3)

        return mapxstring
    } else {
        return null
    }
}

/**
 * Transforms an ISO19139 json object into a MAPX object.
 *
 * @param {obj} data - an ISO19139 object (i.e. an iso19139 XML transformed via xml2json)
 * @param {obj} params - a multipurpose obj for passing extra params
 *
 * @returns {obj} - a MAPX object
 */
export function iso19139ToMapxInternal(data, params) {
    // sanitize params
    if (params === null || typeof params == 'undefined') {
        params = {}
    }

    var log = UTILS.PARAM_LOG_INFO_NAME in params ? params[UTILS.PARAM_LOG_INFO_NAME] : false
    var logger = UTILS.getLogger(params)


    var mapx = new MAPX.MapX()
    mapx.setLogger(logger)

    var mdRoot

    if (data[MD_ROOT_NAME]) {
        if (log) {
            logger.log(`Not unwrapping root ${MD_ROOT_NAME}`)
        }
        mdRoot = getFirstFromPath(data, MD_ROOT_NAME, logger)
    } else {
        var rootName = Object.keys(data)[0]
        if (log) {
            logger.log(`Unwrapping ${rootName}`)
        }
        mdRoot = getFirstFromPath(data, [rootName, MD_ROOT_NAME], logger)
    }

    if (!mdRoot) {
        logger.warn(`Could not find the root ${MD_ROOT_NAME} element`)
        return null
    }

    // Look for some of the main nodes
    if (mdRoot.identificationInfo && mdRoot.identificationInfo.length > 1) {
        logger.warn('More than 1 identificationInfo found')
    }

    var identificationInfo = getFirstFromPath(mdRoot, 'identificationInfo', logger)

    var dataIdent = getFirstFromPath(identificationInfo, DATA_IDENT_NAME)
    var srvIdent = getFirstFromPath(identificationInfo, SERV_IDENT_NAME)

    var identNode = dataIdent ?
        dataIdent :
        srvIdent

    var dataCitationNode = getFirstFromPath(identNode, ['citation', CI_CITATION], logger)

    var uuid = getFirstFromPath(mdRoot, ['fileIdentifier', GCO_CHAR_NAME], logger)
    if (log) {
        logger.log(`METADATA ID [${uuid}]`)
    }

    // Fetch metadata language
    var mdLang = getFirstFromPath(mdRoot, ['language', 'LanguageCode'])
    if (mdLang) {
        mdLang = mdLang.$.codeListValue
    } else {
        logger.log('Metadata language not found - forcing eng')
        mdLang = 'eng'
    }

    // rmb metadata lang for inserting text in mapx
    var lang = UTILS.I2M_lang_map(mdLang)
    if (!lang) {
        logger.warn(`Can't map metadata language [${mdLang}] - forcing eng`)
        lang = 'en'
    }

    if (lang != 'en') {
        logger.warn("English metadata were not found during the conversion process. " +
            "These are compulsory in MapX and must be filled manually before the metadata are published.")
    }

    if (log) {
        logger.log(`Metadata language [${lang}]`)
    }

    // Fetch data languages
    var langList = []

    var resLangList = getListFromPath(identNode, 'language')
    if (resLangList) {
        for (var resLang of resLangList) {
            var langNode = getFirstFromPath(resLang, 'LanguageCode', logger)
            if (langNode) {
                var langCode = langNode.$.codeListValue
                if (!(langList.includes(langCode))) {
                    langList.push(langCode)
                }
            } else {
                logger.warn(`Can't find expected LanguageCode element for data`)
            }
        }
    }

    // Parse languages
    if (langList.length == 0) {
        logger.warn('Data language not found - forcing eng')
        langList.push('eng') // default entry
    }

    for (var isoLang of langList) {
        var mapxlang
        if (isoLang.length === 2) {
            logger.warn(`ISO language definition should be 3 letter [${isoLang}]`)
            mapxlang = isoLang
        } else {
            mapxlang = UTILS.I2M_lang_map(isoLang)
            if (!mapxlang) {
                mapxlang = 'en' // default language
                logger.warn(`Can't map language [${isoLang}]`)
            }
        }
        mapx.addLanguage(mapxlang) // will check for lang existence by itself
    }

    // === Title
    var title = getFirstFromPath(dataCitationNode, ['title', GCO_CHAR_NAME], logger)
    if (title && title != UTILS.DEFAULT_MISSING_CONTENT) {
        mapx.setTitle(lang, title)
    } else {
        logger.warn("Can't generate mandatory MAPX element: title")
    }

    // === Abstract
    var abstract = getFirstFromPath(identNode, ['abstract', GCO_CHAR_NAME], logger)
    if (abstract && abstract != UTILS.DEFAULT_MISSING_CONTENT) {
        mapx.setAbstract(lang, abstract)
    } else {
        logger.warn("Can't generate mandatory MAPX element: abstract")
    }

    // === Keywords
    var descrKwList = getListFromPath(identNode, 'descriptiveKeywords')
    for (var dk of descrKwList || []) {
        for (var keywords of dk.MD_Keywords) {
            for (var keyword of keywords.keyword) {
                var kwNode = getFirstFromPath(keyword, GCO_CHAR_NAME)
                if (kwNode)
                    mapx.addKeyword(kwNode)
                else
                    logger.warn(`Can't find expected keyword`)
            }
        }
    }
    if (mapx.getKeywords().length == 0) {
        logger.warn("Can't generate mandatory MAPX element: keys")
    }

    // === Topics
    var topicCatList = getListFromPath(identNode, 'topicCategory')
    for (var topic of topicCatList || []) {
        var codeNode = getFirstFromPath(topic, 'MD_TopicCategoryCode')
        if (codeNode)
            mapx.addTopic(codeNode)
        else
            logger.warn(`Can't find expected MD_TopicCategoryCode element`)
    }

    // === SuppInfo
    var suppInfo = getFirstFromPath(identNode, ['supplementalInformation', GCO_CHAR_NAME])
    if (suppInfo == UTILS.DEFAULT_MISSING_CONTENT) {
        suppInfo = ''
    }
    var parsedSuppInfo = parseSuppInfo(suppInfo)

    suppInfo = parsedSuppInfo.text
    var attributes = parsedSuppInfo.attributes

    for (var attr of attributes) {

        var decodedName = attr.name.replace("::", ":").replace(";;", ";")
        var decodedVal = attr.value ? attr.value.replace("::", ":").replace(";;", ";") : attr.value
        mapx.setAttribute(lang, decodedName, decodedVal)
    }

    // === Notes
    mapx.addNote(lang, 'Purpose', getFirstFromPath(identNode, ['purpose', GCO_CHAR_NAME]))
    mapx.addNote(lang, 'Credit', getFirstFromPath(identNode, ['credit', GCO_CHAR_NAME]))

    var progressCode = getFirstFromPath(identNode, ['status', 'MD_ProgressCode'])
    var progressValue = progressCode ? progressCode.$[ATTR_CLV].replace(/^\w/, (c) => c.toUpperCase()) : undefined
    mapx.addNote(lang, 'Status', progressValue)

    mapx.addNote(lang, 'Environment', getFirstFromPath(identNode, ['environmentDescription', GCO_CHAR_NAME]))

    var suppInfoTitle = suppInfo && suppInfo.startsWith('Supplemental information') ? null : 'Supplemental information'
    mapx.addNote(lang, suppInfoTitle, suppInfo)

    // add lineage and processing steps
    if (mdRoot.dataQualityInfo) {
        for (var qinfo of mdRoot.dataQualityInfo) {
            var lineage = getFirstFromPath(qinfo, ['DQ_DataQuality', 'lineage', 'LI_Lineage'])
            if (lineage) {
                mapx.addNote(lang, 'Lineage', getFirstFromPath(lineage, ['statement', GCO_CHAR_NAME]))

                // add process steps
                // "processStep":[{"LI_ProcessStep":[{"description":[{"CharacterString":["detailed description of processing: deliverables 3.7 and 3.8 available at: http://www.envirogrids.net/index.php?option=com_content&view=article&id=23&Itemid=40"]}]
                if (lineage.processStep) {
                    for (var pstep of lineage.processStep) {
                        var stepDescr = getFirstFromPath(pstep, ['LI_ProcessStep', 'description', GCO_CHAR_NAME])
                        var stepRatio = getFirstFromPath(pstep, ['LI_ProcessStep', 'rationale', GCO_CHAR_NAME])

                        var stepText =
                            (stepDescr ? `DESCRIPTION: ${stepDescr}\n` : '') +
                            (stepRatio ? `RATIONALE: ${stepRatio}\n` : '')

                        mapx.addNote(lang, 'PROCESSING STEP', stepText)
                    }
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
    var isoFreqNode = getFirstFromPath(identNode, ['resourceMaintenance', 'MD_MaintenanceInformation', 'maintenanceAndUpdateFrequency', 'MD_MaintenanceFrequencyCode'])
    if (isoFreqNode) {
        var isoFreqVal = isoFreqNode.$.codeListValue

        var mapxFreq = UTILS.FREQ_MAPPING_I2M[isoFreqVal]
        mapx.setPeriodicity(mapxFreq || 'unknown')
    }

    // Retrieve dates
    var datemap = {
        creation: undefined,
        publication: undefined,
        revision: undefined
    }

    var datestampDate = getFirstFromPath(mdRoot, ['dateStamp', 'Date'])
    var datestampTime = getFirstFromPath(mdRoot, ['dateStamp', 'DateTime'])
    var metadataDate = formatDate(
        MAPX.checkDate(datestampTime) ? datestampTime : undefined,
        MAPX.checkDate(datestampDate) ? datestampDate : undefined,
        logger)

    var dateList = getListFromPath(dataCitationNode, 'date')
    for (var date of dateList || []) {
        if (log) {
            console.log(`Found date ${JSON.stringify(date)}`)
        }
        // {"CI_Date":[{
        //      "date":[{
        //          "DateTime":["2012-04-24T13:52:00"]}],
        //      "dateType":[{
        //          "CI_DateTypeCode":[{"$":{"codeListValue":"publication"

        var typeNode = getFirstFromPath(date, ['CI_Date', 'dateType', 'CI_DateTypeCode'])
        var typeValue = typeNode.$.codeListValue

        var dateTimeVal = getFirstFromPath(date, ['CI_Date', 'date', 'DateTime'])
        var dateVal = getFirstFromPath(date, ['CI_Date', 'date', 'Date'])

        var mapxdate = formatDate(
            MAPX.checkDate(dateTimeVal) ? dateTimeVal : undefined,
            MAPX.checkDate(dateVal) ? dateVal : undefined,
            logger)

        if (mapxdate) {
            datemap[typeValue] = mapxdate
            //            logger.warn(`PARSED DATE ${typeValue} --> ${mapxdate} FROM ${dateVal}`)
        }
    }

    // MAPX released and modified date
    // https://github.com/geosolutions-it/iso19139_mapx_converter/issues/33

    var updateDate = datemap.revision
    var releaseDate = datemap.publication

    if (!releaseDate) {
        logger.warn(`No publication date available`)

        // some heuristic to create a releaseDate
        if (datemap.creation) {
            releaseDate = datemap.creation
            logger.warn(`Trying using data creation date as release date: ${releaseDate}`)
        } else if (metadataDate) {
            releaseDate = metadataDate
            logger.warn(`Trying using metadata timestamp as release date: ${releaseDate}`)
        }

        // make sure the releaseDate is not after the updateDate
        if (releaseDate && updateDate && releaseDate.localeCompare(updateDate) > 0) {
            logger.warn(`Release date set to default value, since picked value (${releaseDate}) follows Modified Date (${updateDate})`)
            releaseDate = undefined
        }
    }

    mapx.setReleaseDate(releaseDate ? releaseDate : DATE_DEFAULT)
    mapx.setModifiedDate(updateDate ? updateDate : DATE_DEFAULT)

    // == Range
    // "extent":[
    //      {"EX_Extent":[
    //          {"temporalElement":[
    //              {"EX_TemporalExtent":[
    //                  {"extent":[{"TimePeriod":[
    //                      {"$":{"gml:id":"d425e521a1052958"},
    //                      "beginPosition":["2040-01-03T00:00:00"],
    //                      "endPosition":["2040-01-02T00:00:00"]}]}]}]}]}]
    var timePeriod = findFirstFromPath(identNode, ['extent', 'EX_Extent', 'temporalElement', 'EX_TemporalExtent', 'extent', 'TimePeriod'])
    if (timePeriod) {
        var optStart = timePeriod.beginPosition
        var optEnd = timePeriod.endPosition

        if (optStart) {
            mapx.setTemporalStart(formatDate(optStart[0]), null, logger)
        }
        if (optEnd) {
            mapx.setTemporalEnd(formatDate(optEnd[0]), null, logger)
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

    var crsid = getFirstFromPath(mdRoot, ['referenceSystemInfo', 'MD_ReferenceSystem', 'referenceSystemIdentifier', 'RS_Identifier', 'code', GCO_CHAR_NAME])
    if (log) {
        logger.log(`CRS [${JSON.stringify(crsid)}]`)
    }
    if (crsid) {
        var epsgcode = extractEpsgCode(crsid)
        if (epsgcode) {
            mapx.setCrs(`EPSG:${epsgcode}`, `http://spatialreference.org/ref/epsg/${epsgcode}/`)
        } else {
            // copy it verbatim
            mapx.setCrs(crsid, 'http://spatialreference.org/ref/epsg/0/')
        }
    } else {
        // use the default
        logger.warn('CRS not found')
    }

    // == BBOX
    // "extent":[{"EX_Extent":[{"geographicElement":[{"EX_GeographicBoundingBox":[{"westBoundLongitude":[{"Decimal":["7"]}],"eastBoundLongitude":[{"Decimal":["48.00000000000001"]}],"southBoundLatitude":[{"Decimal":["36"]}],"northBoundLatitude":[{"Decimal":["58.00000000000001"
    var geoextent = findFirstFromPath(identNode, ['extent', 'EX_Extent', 'geographicElement', 'EX_GeographicBoundingBox'])

    if (geoextent) {
        mapx.setBBox(
            getFirstFromPath(geoextent, ['westBoundLongitude', 'Decimal'], logger) || null,
            getFirstFromPath(geoextent, ['eastBoundLongitude', 'Decimal'], logger) || null,
            getFirstFromPath(geoextent, ['southBoundLatitude', 'Decimal'], logger) || null,
            getFirstFromPath(geoextent, ['northBoundLatitude', 'Decimal'], logger) || null
        )
    }

    // === Contacts

    // add all metadata contacts
    addContacts(mapx, 'Metadata', getListFromPath(mdRoot, 'contact') || [])

    // add all data contacts
    addContacts(mapx, 'Dataset', getListFromPath(identNode, 'pointOfContact') || [])

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

    var distributionNode = getFirstFromPath(mdRoot, ['distributionInfo', 'MD_Distribution'])
    if (distributionNode && distributionNode.transferOptions) {
        for (var transfOpt of distributionNode.transferOptions) {
            for (var dto of transfOpt.MD_DigitalTransferOptions) {
                for (var online of dto.onLine || []) {
                    for (var onlineRes of online.CI_OnlineResource) {
                        var link = getFirstFromPath(onlineRes, 'linkage', logger)
                        var url = getFirstFromPath(link, 'URL', logger)
                        var proto = getFirstFromPath(onlineRes, ['protocol', GCO_CHAR_NAME])
                        var name = getFirstFromPath(onlineRes, ['name', GCO_CHAR_NAME])

                        // lots of heuristic here
                        var isDownload = (proto !== undefined) && proto.startsWith('WWW:DOWNLOAD')

                        if (proto && proto.endsWith('get-map')) {
                            url = `${url}&LAYER=${name}`
                        }

                        if (url.length > 0) {
                            mapx.addSource(url, isDownload)
                        }
                    }
                }
            }
        }
    }

    // === License
    addCostraints(mapx, getListFromPath(mdRoot, 'metadataConstraints'), 'Metadata')
    addCostraints(mapx, getListFromPath(identNode, 'resourceConstraints'), 'Dataset')

    return mapx
}

const RP_INDIVIDUAL_NAME = 'individualName'
const RP_POSITION_NAME = 'positionName'
const RP_ORG_NAME = 'organisationName'

const RP_CONTACT_INFO = 'contactInfo'
const RP_CI_CONTACT = 'CI_Contact'

const RP_PHONE = 'phone'
const RP_CI_TELEPHONE = 'CI_Telephone'

const RP_VOICE = 'voice'
const RP_FAX = 'facsimile'

const RP_ADDRESS = 'address'
const RP_CI_ADDRESS = 'CI_Address'
const RP_ADDR_DELIVERY = 'deliveryPoint'
const RP_ADDR_CITY = 'city'
const RP_ADDR_ADMINAREA = 'administrativeArea'
const RP_ADDR_ZIP = 'postalCode'
const RP_ADDR_COUNTRY = 'country'
const RP_ADDR_EMAIL = 'electronicMailAddress'

const RP_ROLE = 'role'
const RP_CI_ROLECODE = 'CI_RoleCode'

function parseResponsibleParty(rp) {
    var rpMap = {}

    rpMap[RP_INDIVIDUAL_NAME] = getFirstFromPath(rp, [RP_INDIVIDUAL_NAME, GCO_CHAR_NAME])
    rpMap[RP_POSITION_NAME] = getFirstFromPath(rp, [RP_POSITION_NAME, GCO_CHAR_NAME])
    rpMap[RP_ORG_NAME] = getFirstFromPath(rp, [RP_ORG_NAME, GCO_CHAR_NAME])

    var contactInfo = getFirstFromPath(rp, [RP_CONTACT_INFO, RP_CI_CONTACT])
    var field

    if (contactInfo !== null) {
        var phone = getFirstFromPath(contactInfo, [RP_PHONE, RP_CI_TELEPHONE])
        for (field of [RP_VOICE, RP_FAX]) {
            rpMap[field] = getFirstFromPath(phone, [field, GCO_CHAR_NAME])
        }

        var address = getFirstFromPath(contactInfo, [RP_ADDRESS, RP_CI_ADDRESS])
        for (field of [RP_ADDR_DELIVERY, RP_ADDR_CITY, RP_ADDR_ADMINAREA, RP_ADDR_ZIP, RP_ADDR_COUNTRY, RP_ADDR_EMAIL]) {
            rpMap[field] = getFirstFromPath(address, [field, GCO_CHAR_NAME])
        }
    }

    // Extract role
    // "role":[{"CI_RoleCode":[{"$":{"codeListValue":"pointOfContact","codeList":"http://standa...
    var rolecode = getFirstFromPath(rp, [RP_ROLE, RP_CI_ROLECODE])
    var roleValue = rolecode ? rolecode.$[ATTR_CLV] : 'unknown'

    if (roleValue in UTILS.ROLE_MAPPING_TRANS) {
        roleValue = UTILS.ROLE_MAPPING_TRANS[roleValue]
    }
    rpMap[RP_ROLE] = roleValue

    return rpMap
}

function addContacts(mapx, context, isoContacts) {
    for (var isoContact of isoContacts) {
        var parsedContact = parseResponsibleParty(getFirstFromPath(isoContact, CI_RP) || {})
        const [mfunc, mname, maddr, mmail] = mapContact(parsedContact)
        mapx.addContact(`${context} ${mfunc}`, mname, maddr, mmail)
    }
}

function mapContact(parsedContact) {
    var names = []
    if (parsedContact[RP_INDIVIDUAL_NAME]) {
        names.push(parsedContact[RP_INDIVIDUAL_NAME])
    }
    if (parsedContact[RP_POSITION_NAME]) {
        names.push(parsedContact[RP_POSITION_NAME])
    }
    var retnames = names.join(', ')

    var addrs = []
    if (parsedContact[RP_ORG_NAME]) {
        addrs.push(parsedContact[RP_ORG_NAME])
    }
    if (parsedContact[RP_ADDR_DELIVERY]) {
        addrs.push(`Address: ${parsedContact[RP_ADDR_DELIVERY]}`)
    }
    if (parsedContact[RP_ADDR_CITY]) {
        addrs.push(`City: ${parsedContact[RP_ADDR_CITY]}`)
    }
    if (parsedContact[RP_ADDR_ADMINAREA]) {
        addrs.push(`(${parsedContact[RP_ADDR_ADMINAREA]})`)
    }
    if (parsedContact[RP_ADDR_ZIP]) {
        addrs.push(`ZIP ${parsedContact[RP_ADDR_ZIP]}`)
    }
    if (parsedContact[RP_ADDR_COUNTRY]) {
        addrs.push(`Country: ${parsedContact[RP_ADDR_COUNTRY]}`)
    }
    if (parsedContact[RP_VOICE]) {
        addrs.push(`Phone: ${parsedContact[RP_VOICE]}`)
    }
    if (parsedContact[RP_FAX]) {
        addrs.push(`Fax: ${parsedContact[RP_FAX]}`)
    }

    var retaddr = addrs.join(' - ')

    return [parsedContact[RP_ROLE], retnames, retaddr, parsedContact[RP_ADDR_EMAIL]]
}


export function getFirstFromPath(m, path, logger = null) {
    return getFromPath(true, m, path, logger)
}

export function getListFromPath(m, path, logger = null) {
    return getFromPath(false, m, path, logger)
}

function getFromPath(cutlastlist, m, path, logger = null) {
    if (m === undefined) {
        if (logger) {
            logger.warn(`Could not search path ${path.join('/')}: root node is null`)
        }

        return undefined
    }

    if (!Array.isArray(path)) {
        path = [path]
    }

    var nodeset = m

    var index = 0
    for (var step of path) {
        var node = nodeset[step]
        if (node) {
            // console.log(`FOUND step ${step} -- ${node}`)
            if (Array.isArray(node)) {
                // console.log(`UNLISTING step ${step}`)
                if (index < path.length - 1 || cutlastlist) {
                    nodeset = node[0] // take first node in list
                } else {
                    // console.log(`NOT CUTTING LIST for step ${step} in ${path}`)
                    nodeset = node
                }
            } else {
                nodeset = node
            }
        } else {
            if (logger) {
                logger.warn(`Could not find element ${step} in path ${path.join('/')}`)
            }
            return undefined
        }
        index++
    }

    return nodeset
}


export function findFirstFromPath(nodeset, path, index) {
    if (nodeset === undefined) {
        return undefined
    }

    if (index === undefined) {
        index = 0
    } // init index if not in params

    var nodeName = path[index]

    if (nodeset[nodeName]) {
        if (index === path.length - 1) {
            return nodeset[nodeName][0]
        } else {
            for (var child of nodeset[nodeName]) {
                var found = findFirstFromPath(child, path, index + 1)
                if (found) {
                    return found
                }
            }
        }
    }

    return undefined
}

function formatDate(dateTime, date, logger) {
    var d = dateTime || date
    if (d) {
        if (d.length === 4) {
            logger.warn(`Date not valid "${d}"`)
            return undefined
        }
        var ret = d.substring(0, 10)
        if (MAPX.checkDate(ret)) {
            return ret
        }
        logger.warn(`Date not valid "${ret}"`)
        return undefined
    } else return undefined
}

function extractEpsgCode(crsid) {
    // some well known values
    if (crsid === 'GCS_WGS_1984') {
        return '4326'
    }

    // some heuristic
    const RE = [
        /.*\(EPSG:([0-9]+)\)/,
        /EPSG:([0-9]+)/
    ]

    for (var re of RE) {
        var m = crsid.match(re)
        if (m) {
            return m[1]
        }
    }
    return undefined
}

function addCostraints(mapx, constraintsList, context) {
    if (constraintsList === undefined) {
        return
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

    var c, acc, ul, code, text

    for (var constraints of constraintsList || []) {
        for (c of constraints.MD_Constraints || []) {
            for (ul of c.useLimitation) {
                for (text of ul[GCO_CHAR_NAME]) {
                    mapx.addLicense(`${context} generic use limitation`, text)
                }
            }
        }

        for (c of constraints.MD_LegalConstraints || []) {
            for (ul of c.useLimitation || []) {
                for (text of ul[GCO_CHAR_NAME]) {
                    mapx.addLicense(`${context} legal use limitation`, text)
                }
            }

            for (acc of c.accessConstraints || []) {
                code = acc.MD_RestrictionCode[0].$.codeListValue
                if (code != 'otherRestrictions') {
                    mapx.addLicense(`${context} legal access constraint`, code)
                }
            }
            for (acc of c.useConstraints || []) {
                code = acc.MD_RestrictionCode[0].$.codeListValue
                if (code != 'otherRestrictions') {
                    mapx.addLicense(`${context} legal use constraint`, code)
                }
            }
            for (acc of c.otherConstraints || []) {
                for (text of acc[GCO_CHAR_NAME] || []) {
                    var [k, l] = heuristicConstraints(text, mapx.getLogger())
                    if (k != null) {
                        mapx.addLicense(k, l)
                    } else {
                        mapx.addLicense(`${context} other legal constraint`, text)
                    }
                }
            }
        }

        for (c of constraints.MD_SecurityConstraints || []) {
            var classification = getFirstFromPath(c, ['classification', 'MD_ClassificationCode'])
            var ccode = classification.$.codeListValue

            var note = getFirstFromPath(c, ['userNote', GCO_CHAR_NAME])
            var csys = getFirstFromPath(c, ['classificationSystem', GCO_CHAR_NAME])
            var hand = getFirstFromPath(c, ['handlingDescription', GCO_CHAR_NAME])

            var textList = []
            if (note) textList.push(`Note: ${note}`)
            if (csys) textList.push(`Classification system: ${csys}`)
            if (hand) textList.push(`Handling description: ${hand}`)

            mapx.addLicense(`${context} security constraints: ${ccode}`, textList.join('\n\n'))
        }
    }
}

function heuristicConstraints(text, logger) {
    for (const k1 of ['Metadata', 'Dataset']) {
        for (const k2 of ['legal use constraint', 'legal access constraint', 'other legal constraint']) {
            var prefix = `${k1} ${k2}: `
            if (text.startsWith(prefix)) {
                logger.log("Found constraints already converted")
                return text.split(": ")
            }
        }
    }
    return [null, null]
}

const xml2json = function(bodyStr, logger) {
    var d = null
    xml2js.parseString(
        bodyStr, {
            tagNameProcessors: [xml2js.processors.stripPrefix]
        },
        function(err, result) {
            if (!err) {
                d = result
            } else {
                logger.warn(`Error parsing XML document: ${err}`)
            }
        })
    return d
}

/**
 * Split attributes definition from inside supplemental text.
 *
 * @param {string} suppInfo
 * @returns {obj} parsed suppinfo: "attributes" a list of attributes found, "text" the text left after removing the attribs
 */
export const parseSuppInfo = function(suppInfo) {

    if (!suppInfo) {
        return {
            text: suppInfo,
            attributes: []
        }
    }

    var cleanSuppInfo = suppInfo
    var attrs = []

    // SUPPINFOATTDESC := "Attributes description:" SPACES ATTLIST
    // ATTLIST := ATTCOUPLE | ATTCOUPLE ";" SPACES ATTLIST
    // ATTCOUPLE := ATTNAME | ATTNAME ":" SPACES ATTVALUE
    // ATTNAME := string
    // ATTVALUE := string
    // SPACES = \s*
    // In order to use ";" and ":" as separators, and not to be confused
    // with ";" and ":" inside ATTNAME and VALUE, we'll escape ":" and ";" in values
    // by doubling them

    const coreRE = "(\\s*(?<name>(?:[^:;]*|::|;;)*)(:\\s*(?<value>([^;]|;;)*))?);"
    const fullRE = `\n?Attributes description:(?<attribs>(${coreRE})+)`

    var re = new RegExp(fullRE);

    var result = re.exec(suppInfo);
    if (!result) {
        return {
            text: cleanSuppInfo,
            attributes: attrs
        }
    }

    var attrString = result.groups['attribs']

    cleanSuppInfo = suppInfo.replace(re, '')

    re = new RegExp(coreRE, 'g');
    while ((result = re.exec(attrString)) !== null) {
        var name = result.groups['name']
        var val = result.groups['value']

        //      console.log(`   <${name}>:<${val}>`);
        attrs.push({
            name: name,
            value: val
        })
    }

    return {
        text: cleanSuppInfo,
        attributes: attrs
    }
}

function createLogger(params) {
    var logger = params && UTILS.PARAM_MESSAGE_HANDLER in params ?
        params[UTILS.PARAM_MESSAGE_HANDLER] :
        new UTILS.DefaultMessageHandler()
    return logger
}