import chai from 'chai'
const assert = chai.assert

import xml2js from 'xml2js'
import builder from 'xmlbuilder'
import fs from 'fs'

import * as M2I from '../src/convert_mapx_to_iso.js'
import * as I2M from '../src/convert_iso_to_mapx.js'
import * as MAPX from '../src/mapx.js'
import * as UTILS from '../src/mapx_utils.js'

const getFirstFromPath = I2M.getFirstFromPath
const getListFromPath = I2M.getListFromPath
const findFirstFromPath = I2M.findFirstFromPath

export const DATE_DEFAULT = '0001-01-01'

export const MD_ROOT_NAME = 'MD_Metadata'
export const DATA_IDENT_NAME = 'MD_DataIdentification'
export const GCO_CHAR_NAME = 'CharacterString'
export const CI_CITATION = 'CI_Citation'

export const VERBOSE = false


export function get_date_from_iso(isoXml) {
    var isoJson = xml2json(isoXml)
    return get_date_from_iso_obj(isoJson)
}

export function get_date_from_iso_obj(isoJson) {
    var ret = {}
    var mdRoot = isoJson[MD_ROOT_NAME]

    var datestamp = getFirstFromPath(mdRoot, ['dateStamp', 'Date']) || getFirstFromPath(mdRoot, ['dateStamp', 'DateTime'])
    if (datestamp) {
        ret['datestamp'] = datestamp
    }

    var identificationInfo = mdRoot['identificationInfo'][0]
    var identNode = identificationInfo[DATA_IDENT_NAME][0]
    // console.log("identNodeificationInfo[0] ", identNode);
    var dataCitationNode = getFirstFromPath(identNode, ['citation', CI_CITATION])
    // console.log("citation ", dataCitationNode);
    for (var date of dataCitationNode['date'] || []) {
        // console.log("date loop ", date);
        var typeNode = getFirstFromPath(date, ['CI_Date', 'dateType', 'CI_DateTypeCode'])
        var typeValue = typeNode.$.codeListValue

        var dateTimeVal = getFirstFromPath(date, ['CI_Date', 'date', 'DateTime'])
        var dateVal = getFirstFromPath(date, ['CI_Date', 'date', 'Date'])

        ret[typeValue] = dateVal || dateTimeVal
    }

    return ret
}


function _get_data_citation(isoJson) {
    var mdRoot = isoJson[MD_ROOT_NAME]
    var identificationInfo = mdRoot['identificationInfo'][0]
    var identNode = identificationInfo[DATA_IDENT_NAME][0]
    return getFirstFromPath(identNode, ['citation', CI_CITATION])
}

export function get_title_from_iso_obj(isoJson) {
    var dataCitationNode = _get_data_citation(isoJson)
    return getFirstFromPath(dataCitationNode, ['title', GCO_CHAR_NAME])
}

export function get_abstract_from_iso_obj(isoJson) {
    var mdRoot = isoJson[MD_ROOT_NAME]
    var identificationInfo = mdRoot['identificationInfo'][0]
    var identNode = identificationInfo[DATA_IDENT_NAME][0]
    return getFirstFromPath(identNode, ['abstract', GCO_CHAR_NAME])
}


export function get_metadata_language_from_iso_obj(isoObj) {
    var mdRoot = isoObj[MD_ROOT_NAME]
    return  mdRoot['language'][0]['LanguageCode'][0]['$']['codeListValue']
}

export function get_data_languages_from_iso_obj(isoJson) {
    var mdRoot = isoJson[MD_ROOT_NAME]
    var identificationInfo = mdRoot['identificationInfo'][0]
    var identNode = identificationInfo[DATA_IDENT_NAME][0]
    var resLangList = getListFromPath(identNode, 'language')
    var ret = []
    if (resLangList) {
        for (var resLang of resLangList) {
            var langNode = getFirstFromPath(resLang, 'LanguageCode')
            if (langNode) {
                ret.push(langNode.$.codeListValue)
            }
        }
    }
    return ret
}

export function set_date_into_iso(isoObj, metadataTimeStamp, creation, revision, publication) {

    set_datestamp_into_iso(isoObj, metadataTimeStamp)

    var mdRoot = isoObj[MD_ROOT_NAME]
    assert.ok(mdRoot)

    var identificationInfo = getFirstFromPath(mdRoot, 'identificationInfo')
    assert.ok(identificationInfo)

    var citation = getFirstFromPath(identificationInfo, ['MD_DataIdentification', 'citation', 'CI_Citation'])

    delete citation['date']

    var date = []
    addDate(date, 'creation', creation)
    addDate(date, 'revision', revision)
    addDate(date, 'publication', publication)

    citation['date'] = date
}

export function set_datestamp_into_iso(isoObj, metadataTimeStamp) {
    var mdRoot = isoObj[MD_ROOT_NAME]
    assert.ok(mdRoot)

    delete mdRoot['dateStamp']['Date']
    delete mdRoot['dateStamp']['DateTime']

    if (metadataTimeStamp) {
        var dateNode = metadataTimeStamp.length > 10 ? 'DateTime' : 'Date'

        mdRoot['dateStamp'] = {
            [dateNode]: metadataTimeStamp
        }
    }
}

export function addDate(dateList, dateType, date) {
    if (!date)
        return

    var cidate = {
        'CI_Date': {
            'date': {
                'Date': date
            },
            'dateType': {
                'CI_DateTypeCode': {
                    '$': {
                        'codeListValue': dateType
                    }
                }
            }
        }
    }

    dateList.push(cidate)
}

export function createStrippedIsoJson(mapx) {

    var logger_param = {[UTILS.PARAM_MESSAGE_HANDLER]: mapx.logger}

    var iso = M2I.mapxToIso19139Internal(mapx, logger_param)
    var xml = builder.create(iso, {
        encoding: 'utf-8'
    })
    var xmlFormatted = xml.end({
        pretty: true
    })

    var result
    var prc = {
        tagNameProcessors: [xml2js.processors.stripPrefix]
    }
    new xml2js.parseString(xmlFormatted, prc, (e, r) => {
        if (e) {
            console.warn(e)
        }
        result = r
    })

    //    console.log("STRIPPED ISO ---> ", JSON.stringify(result, null, 3));
    return result
}

export function get_time_extent_from_iso(iso_xml) {
    const MD_ROOT_NAME = 'MD_Metadata'
    const DATA_IDENT_NAME = 'MD_DataIdentification'

    var ret = {}

    var isoJson = xml2json(iso_xml)

    var mdRoot = isoJson[MD_ROOT_NAME]
    var identificationInfo = mdRoot['identificationInfo'][0]
    var identNode = identificationInfo[DATA_IDENT_NAME][0]

    var timePeriod = findFirstFromPath(identNode, ['extent', 'EX_Extent', 'temporalElement', 'EX_TemporalExtent', 'extent', 'TimePeriod'])

    if (timePeriod) {
        var optStart = timePeriod['beginPosition']
        var optEnd = timePeriod['endPosition']

        if (optStart) {
            ret.start = optStart
        }

        if (optEnd) {
            ret.end = optEnd
        }
    }

    return ret
}

export function create_sample_mapx() {
    var mapx = new MAPX.MapX()

    var mh = new TestMessageHandler()
    mapx.setLogger(mh)

    mapx.addContact('func1', 'name1', 'addr1', 'mail@mail1')
    mapx.addContact('func2', 'name2', 'addr2', 'mail@mail2')
    mapx.addContact('func3', 'name3', 'addr3', 'mail@mail3')

    mapx.addKeyword('kw1')
    mapx.addKeyword('kw2')

    mapx.addLanguage('en')

    mapx.addLicense('licname1', 'lictext1')
    mapx.addLicense('licname2', 'lictext2')
    mapx.addLicense('', 'lictext3')

    mapx.setNotes('en', 'note1', 'textnote1')

    mapx.addReference('ref1')
    mapx.addReference('ref2')
    mapx.addReference('ref3')

    mapx.addSource('http://source1', true)
    mapx.addSource('http://source2', false)

    mapx.setAbstract('en', 'very abstract')
    mapx.setBBox(-10, 10, -20, 20)
    mapx.setCrs('EPSG:4326', 'http://epsg/4326')
    mapx.setHomepage('http://homepage')
    mapx.setModifiedDate('2019-05-01')
    mapx.setPeriodicity('daily')
    mapx.setReleaseDate('2019-01-01')
    mapx.setTitle('en', 'title')

    return mapx
}

export function loadXmlAndTransform(source) {
    // const fs = require("fs");

    var xml = fs.readFileSync(source)
    var mapx = null
    xml2js.parseString(
        xml, {
            tagNameProcessors: [xml2js.processors.stripPrefix]
        },
        function(error, json) {
            if (error === null) {
                //                mapx = I2M.iso19139ToMapxInternal(json, {'log_info':true})
                mapx = I2M.iso19139ToMapxInternal(json, null)
            } else {
                console.error(error)
                console.log(xml)
            }
        }
    )

    return mapx
}

export const loadFromFile = function(url) {
    try {
        return fs.readFileSync(url)
    } catch (err) {
        console.warn('Error while reading file'.err)
        return undefined
    }
}

export const xml2json = function(bodyStr, logger) {
    var d = null
    xml2js.parseString(
        bodyStr, {
            tagNameProcessors: [xml2js.processors.stripPrefix]
        },
        function(err, result) {
            if (!err) {
                d = result
            } else {
                if (logger)
                    logger.warn(`Error parsing XML document: ${err}`)
                else
                    console.warn(`Error parsing XML document: ${err}`)
            }
        })
    return d
}


export function createLoggerParams(logger) {
    return {[UTILS.PARAM_MESSAGE_HANDLER]: logger}
}

export function createTestParams() {
    return createLoggerParams(new TestMessageHandler())
}

export class TestMessageHandler {

    constructor(log_warn=false, log_info=false) {
        this.messages = []
        this.log_warn = log_warn
        this.log_info = log_info
    }

    warn(message) {
        if (this.log_warn) {
            console.warn(message)
        }

        this.messages.push(message)
    }

    info(message) {
        this.log(message)
    }

    log(message) {
        if (this.log_info) {
            console.log(`INFO: ${message}`)
        }

        // this.messages.push(message) // to be used for test only
    }

    messages() {
        console.log("MESSAGES REQUESTED: " + this.messages.length)
        return this.messages
    }
}