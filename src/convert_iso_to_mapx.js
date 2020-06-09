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
 *
 * @returns {string} - a MAPX object as json string
 */
export function iso19139ToMapx (isostring) {
  var isojson = xml2json(isostring)
  var mapxjson = iso19139ToMapxInternal(isojson, null)
  var mapxstring = JSON.stringify(mapxjson, null, 3)

  return mapxstring
}

/**
 * Transforms an ISO19139 json object into a MAPX object.
 *
 * @param {obj} data - an ISO19139 object (i.e. an iso19139 XML transformed via xml2json)
 * @param {obj} params - a multipurpose obj for passing extra params
 *
 * @returns {obj} - a MAPX object
 */
export function iso19139ToMapxInternal (data, params) {
  var log = params ? params[UTILS.PARAM_LOG_INFO_NAME] : false

  var mapx = MAPX.createObject()

  var mdRoot

  if (data[MD_ROOT_NAME]) {
    if (log) { console.log('Not unwrapping ', MD_ROOT_NAME) }
    mdRoot = data[MD_ROOT_NAME]
  } else {
    var rootName = Object.keys(data)[0]
    if (log) { console.log('Unwrapping ', rootName) }
    mdRoot = data[rootName][MD_ROOT_NAME][0]
  }

  // Look for some of the main nodes
  if (mdRoot.identificationInfo && mdRoot.identificationInfo.length > 1) {
    console.warn('More than 1 identinfo found')
  }

  var identificationInfo = mdRoot.identificationInfo[0]

  var dataIdent = identificationInfo[DATA_IDENT_NAME]
  var srvIdent = identificationInfo[SERV_IDENT_NAME]

  var identNode = dataIdent
    ? dataIdent[0]
    : srvIdent[0]

  var dataCitationNode = getFirstFromPath(identNode, ['citation', CI_CITATION])

  var uuid = getFirstFromPath(mdRoot, ['fileIdentifier', GCO_CHAR_NAME])
  if (log) { console.log('METADATA ID', uuid) }

  // Detect language
  var lang
  var isoLang = getFirstFromPath(identNode, ['language', GCO_CHAR_NAME])
  if (isoLang) {
    if (isoLang.length === 2) {
      lang = isoLang
    } else {
      lang = UTILS.LANG_MAPPING_I2M[isoLang]
    }

    if (!lang) {
      lang = 'en' // default language
      if (log) { console.warn("Can't map language ", isoLang) }
    }
    MAPX.add_language(mapx, lang)
  } else {
    lang = 'en' // default language
    if (log) { console.warn('Language definition not found') }
  }

  //    if(log)
  //        console.log("Language", lang)

  // === Title
  var title = getFirstFromPath(dataCitationNode, ['title', GCO_CHAR_NAME])
  MAPX.setTitle(mapx, lang, title)

  // === Abstract
  var abstract = getFirstFromPath(identNode, ['abstract', GCO_CHAR_NAME])
  MAPX.setAbstract(mapx, lang, abstract)

  // === Keywords
  for (var dk of identNode.descriptiveKeywords || []) {
    for (var keywords of dk.MD_Keywords) {
      for (var keyword of keywords.keyword) {
        MAPX.addKeyword(mapx, keyword[GCO_CHAR_NAME][0])
      }
    }
  }

  var cat = getFirstFromPath(identNode, ['topicCategory', 'MD_TopicCategoryCode'])
  if (cat) {
    if (log) { console.log('Category is ', cat) }
    MAPX.addKeyword(mapx, cat)
  }

  // === Notes
  MAPX.addNote(mapx, lang, 'Purpose', getFirstFromPath(identNode, ['purpose', GCO_CHAR_NAME]))
  MAPX.addNote(mapx, lang, 'Credit', getFirstFromPath(identNode, ['credit', GCO_CHAR_NAME]))

  var progressCode = getFirstFromPath(identNode, ['status', 'MD_ProgressCode'])
  var progressValue = progressCode ? progressCode.$[ATTR_CLV].replace(/^\w/, (c) => c.toUpperCase()) : undefined
  MAPX.addNote(mapx, lang, 'Status', progressValue)

  MAPX.addNote(mapx, lang, 'Environment', getFirstFromPath(identNode, ['environmentDescription', GCO_CHAR_NAME]))
  MAPX.addNote(mapx, lang, 'Supplemental information', getFirstFromPath(identNode, ['supplementalInformation', GCO_CHAR_NAME]))

  // add lineage and processing steps
  if (mdRoot.dataQualityInfo) {
    for (var qinfo of mdRoot.dataQualityInfo) {
      var lineage = getFirstFromPath(qinfo, ['DQ_DataQuality', 'lineage', 'LI_Lineage'])
      if (lineage) {
        MAPX.addNote(mapx, lang, 'Lineage', getFirstFromPath(lineage, ['statement', GCO_CHAR_NAME]))

        // add process steps
        // "processStep":[{"LI_ProcessStep":[{"description":[{"CharacterString":["detailed description of processing: deliverables 3.7 and 3.8 available at: http://www.envirogrids.net/index.php?option=com_content&view=article&id=23&Itemid=40"]}]
        if (lineage.processStep) {
          for (var pstep of lineage.processStep) {
            var stepDescr = getFirstFromPath(pstep, ['LI_ProcessStep', 'description', GCO_CHAR_NAME])
            var stepRatio = getFirstFromPath(pstep, ['LI_ProcessStep', 'rationale', GCO_CHAR_NAME])

            var stepText =
                                (stepDescr ? 'DESCRIPTION: ' + stepDescr + '\n' : '') +
                                (stepRatio ? 'RATIONALE: ' + stepRatio + '\n' : '')

            MAPX.addNote(mapx, lang, 'PROCESSING STEP', stepText)
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
    MAPX.setPeriodicity(mapx, mapxFreq || 'unknown')
  }

  // Retrieve dates
  var datemap = {
    creation: undefined,
    publication: undefined,
    revision: undefined
  }

  var datestamp = getFirstFromPath(mdRoot, ['dateStamp', 'Date'])
  var metadataDate = formatDate(datestamp, undefined)

  for (var date of dataCitationNode.date || []) {
    // console.log(JSON.stringify(date));
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
      MAPX.checkDate(dateVal) ? dateVal : undefined)

    if (mapxdate) {
      datemap[typeValue] = mapxdate
    }
  }

  // The Publication Date field must be converted into “temporal>issuance>released_at”.
  // The DateStamp field should not be used basically.
  // In case the Publication Date field is not provided, the dateStamp field should be used instead for the issuance released date.

  // pub null, rev null --> rev = timestamp

  // = Released
  var releaseDate = getFirstDefined([
    datemap.publication,
    datemap.creation,
    DATE_DEFAULT])

  // = Modified
  var updateDate = getFirstDefined([
    datemap.revision,
    datemap.publication,
    datemap.creation,
    DATE_DEFAULT])

  if (releaseDate === DATE_DEFAULT && updateDate === DATE_DEFAULT) {
    releaseDate = metadataDate
  }

  MAPX.setReleaseDate(mapx, releaseDate)
  MAPX.setModifiedDate(mapx, updateDate)

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
      MAPX.setTemporalStart(mapx, formatDate(optStart[0]))
    }
    if (optEnd) {
      MAPX.setTemporalEnd(mapx, formatDate(optEnd[0]))
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
  // console.log("CRS --> ", JSON.stringify(crsid));
  if (crsid) {
    var epsgcode = extractEpsgCode(crsid)
    if (epsgcode) {
      MAPX.setCrs(mapx, 'EPSG:' + epsgcode, 'http://spatialreference.org/ref/epsg/' + epsgcode + '/')
    } else {
      // copy it verbatim
      MAPX.setCrs(mapx, crsid, 'http://spatialreference.org/ref/epsg/0/')
    }
  } else {
    // use the default
    console.warn('CRS not found')
  }

  // == BBOX
  // "extent":[{"EX_Extent":[{"geographicElement":[{"EX_GeographicBoundingBox":[{"westBoundLongitude":[{"Decimal":["7"]}],"eastBoundLongitude":[{"Decimal":["48.00000000000001"]}],"southBoundLatitude":[{"Decimal":["36"]}],"northBoundLatitude":[{"Decimal":["58.00000000000001"
  var geoextent = findFirstFromPath(identNode, ['extent', 'EX_Extent', 'geographicElement', 'EX_GeographicBoundingBox'])

  if (geoextent) {
    MAPX.setBBox(mapx,
      geoextent.westBoundLongitude[0].Decimal[0],
      geoextent.eastBoundLongitude[0].Decimal[0],
      geoextent.southBoundLatitude[0].Decimal[0],
      geoextent.northBoundLatitude[0].Decimal[0]
    )
  }

  // === Contacts

  // add all metadata contacts
  addContacts(mapx, 'Metadata', mdRoot.contact || [])

  // add all data contacts
  addContacts(mapx, 'Dataset', identNode.pointOfContact || [])

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
  for (var transfOpt of distributionNode.transferOptions) {
    for (var dto of transfOpt.MD_DigitalTransferOptions) {
      for (var online of dto.onLine || []) {
        for (var onlineRes of online.CI_OnlineResource) {
          var link = onlineRes.linkage[0]
          var url = getFirstFromPath(link, ['URL'])
          var proto = getFirstFromPath(onlineRes, ['protocol', GCO_CHAR_NAME])
          var name = getFirstFromPath(onlineRes, ['name', GCO_CHAR_NAME])

          // lots of heuristic here
          var isDownload = (proto !== undefined) && proto.startsWith('WWW:DOWNLOAD')

          if (proto && proto.endsWith('get-map')) { url = url + '&LAYER=' + name }

          if (url.length > 0) { MAPX.addSource(mapx, url, isDownload) }
        }
      }
    }
  }

  // === License
  addCostraints(mapx, mdRoot.metadataConstraints, 'Metadata')
  addCostraints(mapx, identNode.resourceConstraints, 'Dataset')

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

function parseResponsibleParty (rp) {
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

function addContacts (mapx, context, isoContacts) {
  for (var isoContact of isoContacts) {
    var parsedContact = parseResponsibleParty(isoContact[CI_RP][0])
    const [mfunc, mname, maddr, mmail] = mapContact(parsedContact)
    MAPX.addContact(mapx, context + ' ' + mfunc, mname, maddr, mmail)
  }
}

function mapContact (parsedContact) {
  var names = []
  if (parsedContact[RP_INDIVIDUAL_NAME]) { names.push(parsedContact[RP_INDIVIDUAL_NAME]) }
  if (parsedContact[RP_POSITION_NAME]) { names.push(parsedContact[RP_POSITION_NAME]) }
  var retnames = names.join(', ')

  var addrs = []
  if (parsedContact[RP_ORG_NAME]) { addrs.push(parsedContact[RP_ORG_NAME]) }
  if (parsedContact[RP_ADDR_DELIVERY]) { addrs.push('Address: ' + parsedContact[RP_ADDR_DELIVERY]) }
  if (parsedContact[RP_ADDR_CITY]) { addrs.push('City: ' + parsedContact[RP_ADDR_CITY]) }
  if (parsedContact[RP_ADDR_ADMINAREA]) { addrs.push('(' + parsedContact[RP_ADDR_ADMINAREA] + ')') }
  if (parsedContact[RP_ADDR_ZIP]) { addrs.push('ZIP ' + parsedContact[RP_ADDR_ZIP]) }
  if (parsedContact[RP_ADDR_COUNTRY]) { addrs.push('Country: ' + parsedContact[RP_ADDR_COUNTRY]) }
  if (parsedContact[RP_VOICE]) { addrs.push('Phone: ' + parsedContact[RP_VOICE]) }
  if (parsedContact[RP_FAX]) { addrs.push('Fax: ' + parsedContact[RP_FAX]) }

  var retaddr = addrs.join(' - ')

  return [parsedContact[RP_ROLE], retnames, retaddr, parsedContact[RP_ADDR_EMAIL]]
}

export function getFirstFromPath (m, path) {
  if (m === undefined) { return undefined }

  var nodeset = m

  for (var step of path) {
    var node = nodeset[step]
    if (node) {
      nodeset = node[0] // take first node
    } else {
      return undefined
    }
  }

  return nodeset
}

export function findFirstFromPath (nodeset, path, index) {
  if (nodeset === undefined) { return undefined }

  if (index === undefined) { index = 0 } // init index if not in params

  var nodeName = path[index]

  if (nodeset[nodeName]) {
    if (index === path.length - 1) { return nodeset[nodeName][0] } else {
      for (var child of nodeset[nodeName]) {
        var found = findFirstFromPath(child, path, index + 1)
        if (found) { return found }
      }
    }
  }

  return undefined
}

function getFirstDefined (valuesList) {
  for (var val of valuesList) {
    if (val) { return val }
  }

  return undefined
}

function formatDate (dateTime, date) {
  var d = dateTime || date
  if (d) {
    if (d.length === 4) { return DATE_DEFAULT }
    var ret = d.substring(0, 10)
    if (MAPX.checkDate(ret)) { return ret }
    return DATE_DEFAULT
  } else return DATE_DEFAULT
}

function extractEpsgCode (crsid) {
  // some well known values
  if (crsid === 'GCS_WGS_1984') { return '4326' }

  // some heuristic
  const RE = [
    /.*\(EPSG:([0-9]+)\)/,
    /EPSG:([0-9]+)/]

  for (var re of RE) {
    var m = crsid.match(re)
    if (m) {
      return m[1]
    }
  }
  return undefined
}

function addCostraints (mapx, constraintsList, context) {
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
          MAPX.addLicense(mapx, context + ' generic use limitation', text)
        }
      }
    }

    for (c of constraints.MD_LegalConstraints || []) {
      for (ul of c.useLimitation || []) {
        for (text of ul[GCO_CHAR_NAME]) {
          MAPX.addLicense(mapx, context + ' legal use limitation', text)
        }
      }

      for (acc of c.accessConstraints || []) {
        code = acc.MD_RestrictionCode[0].$.codeListValue
        MAPX.addLicense(mapx, context + ' legal access constraint', code)
      }
      for (acc of c.useConstraints || []) {
        code = acc.MD_RestrictionCode[0].$.codeListValue
        MAPX.addLicense(mapx, context + ' legal use constraint', code)
      }
      for (acc of c.otherConstraints || []) {
        for (text of acc[GCO_CHAR_NAME] || []) {
          MAPX.addLicense(mapx, context + ' other legal constraint', text)
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
      if (note) textList.push('Note: ' + note)
      if (csys) textList.push('Classification system: ' + csys)
      if (hand) textList.push('Handling description: ' + hand)

      MAPX.addLicense(mapx, context + ' security constraints: ' + ccode, textList.join('\n\n'))
    }
  }
}

const xml2json = function (bodyStr) {
  var d = {}
  xml2js.parseString(
    bodyStr,
    {
      tagNameProcessors: [xml2js.processors.stripPrefix]
    },
    function (err, result) {
      if (!err) {
        d = result
      }
    })
  return d
}