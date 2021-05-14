/*
 */

//import * as assert from 'assert'
import chai from 'chai'
const assert = chai.assert

import xml2js from 'xml2js'
import builder from 'xmlbuilder'
import fs from 'fs'

import * as M2I from '../src/convert_mapx_to_iso.js'
import * as I2M from '../src/convert_iso_to_mapx.js'
import * as MAPX from '../src/mapx.js'

import {
    dirname
} from 'path'
import {
    fileURLToPath
} from 'url'

const getFirstFromPath = I2M.getFirstFromPath
const findFirstFromPath = I2M.findFirstFromPath

const DATE_DEFAULT = '0001-01-01'

const MD_ROOT_NAME = 'MD_Metadata'
const DATA_IDENT_NAME = 'MD_DataIdentification'
const GCO_CHAR_NAME = 'CharacterString'
const CI_CITATION = 'CI_Citation'

const __dirname = dirname(fileURLToPath(
    import.meta.url))

it('Basic MAPX object parsing', function(done) {
    var mapx = create_sample_mapx()

    var json = JSON.stringify(mapx.mapx, null, 3)
    var mobj = JSON.parse(json)
    var pars = new MAPX.MapX(mobj)

    assert.equal(mapx.getTitle('en'), 'title', 'M title mismatch')
    assert.equal(pars.getTitle('en'), 'title', 'P title mismatch')

    assert.equal(mapx.getContacts()[0].function, 'func1', `M func1 mismatch ${JSON.stringify(mapx.getContacts()[0])}`)
    assert.equal(pars.getContacts()[0].function, 'func1', `P func1 mismatch ${JSON.stringify(pars.getContacts()[0])}`)

    assert.equal(mapx.getContacts()[1].function, 'func2', `M func1 mismatch ${JSON.stringify(mapx.getContacts()[1])}`)
    assert.equal(pars.getContacts()[1].function, 'func2', `P func1 mismatch ${JSON.stringify(pars.getContacts()[1])}`)

    done()
})

it('MAPX to ISO parsing', function(done) {
    var mapx = create_sample_mapx()

    var iso = M2I.mapxToIso19139Internal(mapx)

    // nst builder = require('xmlbuilder');

    var xml = builder.create(iso, {
        encoding: 'utf-8'
    })
    var xmlFormatted = xml.end({
        pretty: true
    })
    // console.log("METADATA as XML", xmlFormatted);
    done()
})

it('Check M2I dates', function(done) {
    var mapx = create_sample_mapx()

    var iso = M2I.mapxToIso19139Internal(mapx)
    var xml = builder.create(iso, {
        encoding: 'utf-8'
    })
    var xmlFormatted = xml.end({
        pretty: true
    })

    var dates = get_date_from_iso(xmlFormatted)

    assert.equal(dates.publication, '2019-01-01')
    assert.equal(dates.revision, '2019-05-01')

    done()
})

it('Check void M2I dates', function(done) {
    var mapx = new MAPX.MapX()
    mapx.addLanguage('en') // avoid warn about missing language

    var iso = M2I.mapxToIso19139Internal(mapx)
    var xml = builder.create(iso, {
        encoding: 'utf-8'
    })
    var xmlFormatted = xml.end({
        pretty: true
    })

    var dates = get_date_from_iso(xmlFormatted)

    assert.equal(Object.keys(dates).length, 2) // 1: forced date in identification for validity + datestamp
    assert.ok(dates['datestamp']) // make sure datestmap is there

    done()
})

it('Check equals M2I dates', function(done) {
    var mapx = new MAPX.MapX()

    mapx.setModifiedDate('2019-09-25')
    mapx.setReleaseDate('2019-09-25')

    var iso = M2I.mapxToIso19139Internal(mapx)
    var xml = builder.create(iso, {
        encoding: 'utf-8'
    })
    var xmlFormatted = xml.end({
        pretty: true
    })

    var dates = get_date_from_iso(xmlFormatted)

    assert.equal(Object.keys(dates).length, 2)
    assert.equal(dates.publication, '2019-09-25')
    assert.ok(dates['datestamp']) // make sure datestmap is there    

    done()
})

it('Check begin time extent', function(done) {
    var mapx = create_sample_mapx()
    mapx.setTemporalStart('2019-09-26')

    var iso = M2I.mapxToIso19139Internal(mapx)
    var xml = builder.create(iso, {
        encoding: 'utf-8'
    })
    var xmlFormatted = xml.end({
        pretty: true
    })
    //    console.log("ISO ", xmlFormatted);

    var dates = get_time_extent_from_iso(xmlFormatted)

    assert.equal(Object.keys(dates).length, 1)
    assert.equal(dates.start, '2019-09-26')

    done()
})

it('#5 M2I check default date mapping', function(done) {
    var mapx = create_sample_mapx()
    assert.equal(true, mapx.isTimeless())

    var isoJson = createStrippedIsoJson(mapx)
    var identNode = isoJson[MD_ROOT_NAME]['identificationInfo'][0][DATA_IDENT_NAME][0]
    var timeExtent = findFirstFromPath(identNode, ['extent', 'EX_Extent', 'temporalElement'])
    assert.ok(typeof timeExtent === 'undefined')

    mapx = create_sample_mapx()
    mapx.setTemporalStart('2019-09-26')
    isoJson = createStrippedIsoJson(mapx)
    identNode = isoJson[MD_ROOT_NAME]['identificationInfo'][0][DATA_IDENT_NAME][0]
    timeExtent = findFirstFromPath(identNode, ['extent', 'EX_Extent', 'temporalElement'])
    assert.ok(typeof timeExtent !== 'undefined')

    mapx = create_sample_mapx()
    mapx.setTemporalStart(DATE_DEFAULT)
    isoJson = createStrippedIsoJson(mapx)
    identNode = isoJson[MD_ROOT_NAME]['identificationInfo'][0][DATA_IDENT_NAME][0]
    timeExtent = findFirstFromPath(identNode, ['extent', 'EX_Extent', 'temporalElement'])
    assert.ok(typeof timeExtent === 'undefined')

    done()
})

it('#7 M2I add annexes', function(done) {
    var mapx = create_sample_mapx()
    assert.equal(3, mapx.getReferences().length)
    assert.equal('ref3', mapx.getReferences()[2])

    var isoJson = createStrippedIsoJson(mapx)
    const MD_ROOT_NAME = 'MD_Metadata'

    var distrNode = isoJson[MD_ROOT_NAME]['distributionInfo'][0]['MD_Distribution'][0]
    var transfNode = distrNode['transferOptions'][0]['MD_DigitalTransferOptions'][0]
    // console.log("MD_DigitalTransferOptions ---> ", JSON.stringify(transfNode));
    var onlineNodes = transfNode['onLine'] // [0]['CI_OnlineResource'];
    // console.log("CI_OnlineResource ---> ", JSON.stringify(onlineNodes));

    assert.equal(6, onlineNodes.length)

    var annex_cnt = 0
    for (var res of onlineNodes) {
        // console.log("RES is ", JSON.stringify(res));
        var name = res['CI_OnlineResource'][0]['name'][0]['CharacterString'][0]
        if (name === 'Annex') {
            annex_cnt++
        }
    }

    assert.equal(3, annex_cnt)

    done()
})

it('#8 M2I constraints semicolon', function(done) {
    var mapx = create_sample_mapx()
    assert.equal(3, mapx.getLicenses().length)

    var isoJson = createStrippedIsoJson(mapx)
    var identNode = isoJson[MD_ROOT_NAME]['identificationInfo'][0][DATA_IDENT_NAME][0]
    var legalNode = identNode['resourceConstraints'][0]['MD_LegalConstraints'][0]
    // console.log("MD_LegalConstraints ---> ", JSON.stringify(legalNode,null,3));
    var otherNode = legalNode['otherConstraints']
    assert.equal(3, otherNode.length)
    assert.equal('licname1: lictext1', otherNode[0]['CharacterString'][0])
    assert.equal('lictext3', otherNode[2]['CharacterString'][0])

    done()
})

it('#9 M2I point of contact', function(done) {
    var mapx = create_sample_mapx()
    mapx.addContact('metadata f1', 'name1', 'addr1', 'mail@mail1')
    mapx.addContact('metadata f2', 'name2', 'addr2', 'mail@mail2')

    assert.equal(5, mapx.getContacts().length)
    var isoJson = createStrippedIsoJson(mapx)

    var md_contacts = isoJson[MD_ROOT_NAME]['contact']
    assert.equal(5, md_contacts.length)

    var identNode = isoJson[MD_ROOT_NAME]['identificationInfo'][0][DATA_IDENT_NAME][0]
    var data_poc = identNode['pointOfContact']
    assert.equal(3, data_poc.length)

    done()
})

it('#33 I2M dates', function(done) {

    var isoxml = loadFromFile(`${__dirname}/data/no_pubdate_yes_revision.xml`)
    assert.ok(isoxml)
    var isoObj = xml2json(isoxml)
    assert.ok(isoObj)

    var CREATION = '2020-01-01'
    var REVISION = '2020-02-01'
    var PUBLICATION = '2020-03-01'
    var METADATA = '2020-04-01'
    var DATE_DEFAULT = '0001-01-01'
    var OLD_DATE = '1900-01-01'

    set_date_into_iso(isoObj, METADATA, CREATION, REVISION, PUBLICATION)

    // check dates are where we expect them
    var dates = get_date_from_iso_obj(isoObj)
    assert.equal(dates.creation, CREATION)
    assert.equal(dates.revision, REVISION)
    assert.equal(dates.publication, PUBLICATION)
    assert.equal(dates.datestamp, METADATA)

    console.log("#33 TEST1")
    assertDates(isoObj, PUBLICATION, REVISION)

    console.log("#33 TEST2")
    set_date_into_iso(isoObj, METADATA, CREATION, 'pippo', PUBLICATION)
    assertDates(isoObj, PUBLICATION, DATE_DEFAULT)

    console.log("#33 TEST3")
    set_date_into_iso(isoObj, METADATA, CREATION, 'pippo', undefined)
    assertDates(isoObj, CREATION, DATE_DEFAULT)

    console.log("#33 TEST4")
    set_date_into_iso(isoObj, METADATA, undefined, undefined, undefined)
    assertDates(isoObj, METADATA, DATE_DEFAULT)

    console.log("#33 TEST5")
    set_date_into_iso(isoObj, METADATA, CREATION, REVISION, undefined)
    assertDates(isoObj, CREATION, REVISION)

    console.log("#33 TEST6")
    set_date_into_iso(isoObj, METADATA, undefined, REVISION, undefined)
    assertDates(isoObj, DATE_DEFAULT, REVISION)

    console.log("#33 TEST7")
    set_date_into_iso(isoObj, OLD_DATE, undefined, REVISION, undefined)
    assertDates(isoObj, OLD_DATE, REVISION)

    done()
})


function assertDates(isoObj, released, modified) {
    var mapx = I2M.iso19139ToMapxInternal(isoObj, null)

    assert.equal(mapx.getReleaseDate(), released)
    assert.equal(mapx.getModifiedDate(), modified)
}

it('#2 I2M comma separated contacts', function(done) {
    var mapx = loadXmlAndTransform(`${__dirname}/data/contacts_01.xml`)

    var cont = mapx.getContacts()[0]

    assert.equal(cont.name, 'CTO')

    done()
})

it('#3 I2M role codes', function(done) {
    var mapx = loadXmlAndTransform(`${__dirname}/data/contacts_01.xml`)

    var cont = mapx.getContacts()[0]

    assert.equal(cont.function, 'Metadata Point of Contact')

    done()
})

it('#4 I2M Org as address', function(done) {
    var mapx = loadXmlAndTransform(`${__dirname}/data/contacts_01.xml`)

    var cont = mapx.getContacts()[1]

    assert.ok(!cont.name.includes('Bren School'))
    assert.ok(cont.address.startsWith('Bren School'))

    done()
})

it('#1 Other - parse date', function(done) {
    assert.ok(MAPX.checkDate('2020-06-09'))
    assert.ok(MAPX.checkDate('2020-06-09T12:00:00'))
    assert.ok(MAPX.checkDate('2020-06-09T12:00'))

    assert.ok(!MAPX.checkDate('2020'))
    assert.ok(!MAPX.checkDate('2020-41-09'))
    assert.ok(!MAPX.checkDate('2020-11-39'))

    done()
})

it('#15 M2I Topic category', function(done) {
    var mapx = create_sample_mapx()
    var isoJson = createStrippedIsoJson(mapx)
    var identNode = isoJson[MD_ROOT_NAME]['identificationInfo'][0][DATA_IDENT_NAME][0]
    var topic = identNode['topicCategory']
    assert.equal(topic, undefined)

    mapx.addTopic(MAPX.TOPICS[0])
    isoJson = createStrippedIsoJson(mapx)
    identNode = isoJson[MD_ROOT_NAME]['identificationInfo'][0][DATA_IDENT_NAME][0]
    topic = identNode['topicCategory']
    assert.equal(1, topic.length)
    var catcode = topic[0]['MD_TopicCategoryCode']
    assert.equal(1, catcode.length)

    mapx.addTopic(MAPX.TOPICS[1])
    isoJson = createStrippedIsoJson(mapx)
    identNode = isoJson[MD_ROOT_NAME]['identificationInfo'][0][DATA_IDENT_NAME][0]
    topic = identNode['topicCategory']
    assert.equal(2, topic.length)
    catcode = topic[0]['MD_TopicCategoryCode']
    assert.equal(1, catcode.length)
    assert.equal('biota', catcode)

    done()
})

it('#15 I2M Topic category', function(done) {
    var mapx = loadXmlAndTransform(`${__dirname}/data/contacts_01.xml`)
    var topics = mapx.getTopics()
    assert.equal(2, topics.length)

    done()
})

it('#14 M2I Check void language', function(done) {
    var mapx = new MAPX.MapX()
    mapx.setReleaseDate('2020-10-10') // avoid warn about missing date
    var isoObj = createStrippedIsoJson(mapx)

    // forced language in metadata
    var mdRoot = isoObj[MD_ROOT_NAME]
    var mdLang = mdRoot['language'][0]['LanguageCode'][0]['$']['codeListValue']
    assert.equal(mdLang, 'eng')

    // forced language in resource
    var identNode = mdRoot['identificationInfo'][0][DATA_IDENT_NAME][0]
    var resLang = findFirstFromPath(identNode, ['language', 'LanguageCode'])
    assert.equal(resLang['$']['codeListValue'], 'eng')

    done()
})

it('Attributes codec: parser', function(done) {

    const encodedSI = 'note00\nAttributes description: name1: value1; name2: value2; name3; name::4: value::4;'

    var parsedSI = I2M.parseSuppInfo(encodedSI)

    assert.equal(parsedSI.text, 'note00')
    assert.equal(parsedSI.attributes.length, 4)
    assert.equal(parsedSI.attributes[0].name, 'name1')
    assert.equal(parsedSI.attributes[3].name, 'name::4')

    assert.equal(parsedSI.attributes[0].value, 'value1')
    assert.isUndefined(parsedSI.attributes[2].value)
    assert.equal(parsedSI.attributes[3].value, 'value::4')

    done()
})


it('Attributes codec: supplementalInfo', function(done) {
    var mapx = new MAPX.MapX()

    mapx.setNotes('en', 'note00')

    mapx.setAttribute('en', 'name1', 'value1')
    mapx.setAttribute('en', 'name2', 'value2')
    mapx.setAttribute('en', 'name3', null)
    mapx.setAttribute('en', 'name:4', 'value:4')

    var isoObj = createStrippedIsoJson(mapx)
    var mdRoot = isoObj[MD_ROOT_NAME]
    var identNode = mdRoot['identificationInfo'][0][DATA_IDENT_NAME][0]
    var suppInfo = getFirstFromPath(identNode, ['supplementalInformation', GCO_CHAR_NAME])
    //    console.log("SUPP INFO ---> ", JSON.stringify(suppInfo,null,3));

    const expectedSuppInfo = 'note00\nAttributes description: name1: value1; name2: value2; name3; name::4: value::4;'

    assert.equal(suppInfo, expectedSuppInfo, "Error encoding M2I")

    // == convert back to mapx
    var mapx2 = I2M.iso19139ToMapxInternal(createStrippedIsoJson(mapx), null)
    //    console.log("MAPX ---> ", JSON.stringify(mapx2,null,3));

    assert.equal(mapx2.getNotes('en'), 'Supplemental information: note00')

    var attributes = mapx2.getAllAttributes()
    var attNames = Object.getOwnPropertyNames(attributes)

    assert.equal(attNames.length, 4)
    assert.equal(attNames[0], 'name1')
    assert.equal(attNames[3], 'name:4')

    assert.equal(attributes['name1']['en'], 'value1')
    assert.isUndefined(attributes['name3']['en'])
    assert.equal(attributes['name:4']['en'], 'value:4')

    done()
})


it('#32 I2M parse Bathymetrie', function(done) {

    var mapx = loadXmlAndTransform(`${__dirname}/data/bathymetrie.xml`)
    done()
})

it('#32 I2M parse missing MD_DataIdentification', function(done) {

    var isoxml = loadFromFile(`${__dirname}/data/contacts_01.xml`)
    assert.ok(isoxml)
    var isojsn = xml2json(isoxml)
    assert.ok(isojsn)

    // console.log(isojsn['MD_Metadata']['identificationInfo'])
    assert.ok(isojsn['MD_Metadata']['identificationInfo'][0]['MD_DataIdentification'])
    delete isojsn['MD_Metadata']['identificationInfo'][0]['MD_DataIdentification']
    var mapx = I2M.iso19139ToMapxInternal(isojsn, null)
    assert.ok(mapx)

    done()
})

it('#32 I2M parse missing identificationInfo', function(done) {

    var isoxml = loadFromFile(`${__dirname}/data/contacts_01.xml`)
    assert.ok(isoxml)
    var isojsn = xml2json(isoxml)
    assert.ok(isojsn)

    assert.ok(isojsn['MD_Metadata']['identificationInfo'])
    delete isojsn['MD_Metadata']['identificationInfo']
    var mapx = I2M.iso19139ToMapxInternal(isojsn, null)
    assert.ok(mapx)

    done()
})

it('#32 I2M parse bad xml', function(done) {

    var isoxml = 'This is not an xml document'
    var mapx = I2M.iso19139ToMapx(isoxml, null)

    done()
})

function get_date_from_iso(isoXml) {
    var isoJson = xml2json(isoXml)
    return get_date_from_iso_obj(isoJson)
}

function get_date_from_iso_obj(isoJson) {
    var ret = {}
    var mdRoot = isoJson[MD_ROOT_NAME]

    var datestamp = getFirstFromPath(mdRoot, ['dateStamp', 'Date'])
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

function set_date_into_iso(isoObj, metadataTimeStamp, creation, revision, publication) {

    var mdRoot = isoObj[MD_ROOT_NAME]
    assert.ok(mdRoot)

    delete mdRoot['dateStamp']['Date']
    if (metadataTimeStamp) {
        mdRoot['dateStamp'] = {
            'Date': metadataTimeStamp
        }
    }

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


function addDate(dateList, dateType, date) {
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

function createNormalizedIsoJson(mapx) {
    var iso = M2I.mapxToIso19139Internal(mapx)
    var xml = builder.create(iso, {
        encoding: 'utf-8'
    })
    var xmlFormatted = xml.end({
        pretty: true
    })

    var result
    //    var prc = {tagNameProcessors: [xml2js.processors.stripPrefix]};
    new xml2js.Parser().parseString(xmlFormatted, (e, r) => {
        if (e) {
            console.warn(e)
        }
        result = r
    })
    return result
}

function createStrippedIsoJson(mapx) {
    var iso = M2I.mapxToIso19139Internal(mapx)
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

function get_time_extent_from_iso(iso_xml) {
    const MD_ROOT_NAME = 'MD_Metadata'
    const DATA_IDENT_NAME = 'MD_DataIdentification'
    const CI_CITATION = 'CI_Citation'

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

function create_sample_mapx() {
    var mapx = new MAPX.MapX()

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

function loadXmlAndTransform(source) {
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

const loadFromFile = function(url) {
    try {
        return fs.readFileSync(url)
    } catch (err) {
        console.warn('Error while reading file'.err)
        return undefined
    }
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
                console.warn(`Error parsing XML document: ${err}`)
            }
        })
    return d
}