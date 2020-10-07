/*
 */

import * as assert from 'assert'
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
const MD_ROOT_NAME = 'gmd:MD_Metadata'
const DATA_IDENT_NAME = 'gmd:MD_DataIdentification'
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

    assert.equal(Object.keys(dates).length, 1) // 1: forced date in identification for validity

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

    assert.equal(Object.keys(dates).length, 1)
    assert.equal(dates.publication, '2019-09-25')

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

    var isoJson = createNormalizedIsoJson(mapx)
    var identNode = isoJson[MD_ROOT_NAME]['gmd:identificationInfo'][0][DATA_IDENT_NAME][0]
    var timeExtent = findFirstFromPath(identNode, ['gmd:extent', 'gmd:EX_Extent', 'gmd:temporalElement'])
    assert.ok(typeof timeExtent === 'undefined')

    mapx = create_sample_mapx()
    mapx.setTemporalStart('2019-09-26')
    isoJson = createNormalizedIsoJson(mapx)
    identNode = isoJson[MD_ROOT_NAME]['gmd:identificationInfo'][0][DATA_IDENT_NAME][0]
    timeExtent = findFirstFromPath(identNode, ['gmd:extent', 'gmd:EX_Extent', 'gmd:temporalElement'])
    assert.ok(typeof timeExtent !== 'undefined')

    mapx = create_sample_mapx()
    mapx.setTemporalStart(DATE_DEFAULT)
    isoJson = createNormalizedIsoJson(mapx)
    identNode = isoJson[MD_ROOT_NAME]['gmd:identificationInfo'][0][DATA_IDENT_NAME][0]
    timeExtent = findFirstFromPath(identNode, ['gmd:extent', 'gmd:EX_Extent', 'gmd:temporalElement'])
    assert.ok(typeof timeExtent === 'undefined')

    done()
})

it('#7 M2I add annexes', function(done) {
    var mapx = create_sample_mapx()
    assert.equal(3, mapx.getReferences().length)
    assert.equal('ref3', mapx.getReferences()[2])

    var isoJson = createNormalizedIsoJson(mapx)
    const MD_ROOT_NAME = 'gmd:MD_Metadata'

    var distrNode = isoJson[MD_ROOT_NAME]['gmd:distributionInfo'][0]['gmd:MD_Distribution'][0]
    var transfNode = distrNode['gmd:transferOptions'][0]['gmd:MD_DigitalTransferOptions'][0]
    // console.log("MD_DigitalTransferOptions ---> ", JSON.stringify(transfNode));
    var onlineNodes = transfNode['gmd:onLine'] // [0]['gmd:CI_OnlineResource'];
    // console.log("CI_OnlineResource ---> ", JSON.stringify(onlineNodes));

    assert.equal(6, onlineNodes.length)

    var annex_cnt = 0
    for (var res of onlineNodes) {
        // console.log("RES is ", JSON.stringify(res));
        var name = res['gmd:CI_OnlineResource'][0]['gmd:name'][0]['gco:CharacterString'][0]
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

    var isoJson = createNormalizedIsoJson(mapx)
    var identNode = isoJson[MD_ROOT_NAME]['gmd:identificationInfo'][0][DATA_IDENT_NAME][0]
    var legalNode = identNode['gmd:resourceConstraints'][0]['gmd:MD_LegalConstraints'][0]
    // console.log("MD_LegalConstraints ---> ", JSON.stringify(legalNode,null,3));
    var otherNode = legalNode['gmd:otherConstraints']
    assert.equal(3, otherNode.length)
    assert.equal('licname1: lictext1', otherNode[0]['gco:CharacterString'][0])
    assert.equal('lictext3', otherNode[2]['gco:CharacterString'][0])

    done()
})

it('#9 M2I point of contact', function(done) {
    var mapx = create_sample_mapx()
    mapx.addContact('metadata f1', 'name1', 'addr1', 'mail@mail1')
    mapx.addContact('metadata f2', 'name2', 'addr2', 'mail@mail2')

    assert.equal(5, mapx.getContacts().length)
    var isoJson = createNormalizedIsoJson(mapx)

    var md_contacts = isoJson[MD_ROOT_NAME]['gmd:contact']
    assert.equal(5, md_contacts.length)

    var identNode = isoJson[MD_ROOT_NAME]['gmd:identificationInfo'][0][DATA_IDENT_NAME][0]
    var data_poc = identNode['gmd:pointOfContact']
    assert.equal(3, data_poc.length)

    done()
})

it('#1 I2M dates', function(done) {
    var mapx = loadXml(`${__dirname}/data/no_pubdate_yes_revision.xml`)

    assert.equal(mapx.getReleaseDate(), DATE_DEFAULT)
    assert.equal(mapx.getModifiedDate(), '2015-07-14')

    mapx = loadXml(`${__dirname}/data/no_pubdate_no_revision.xml`)

    assert.equal(mapx.getReleaseDate(), '2020-01-01')
    assert.equal(mapx.getModifiedDate(), DATE_DEFAULT)

    done()
})

it('#2 I2M comma separated contacts', function(done) {
    var mapx = loadXml(`${__dirname}/data/contacts_01.xml`)

    var cont = mapx.getContacts()[0]

    assert.equal(cont.name, 'CTO')

    done()
})

it('#3 I2M role codes', function(done) {
    var mapx = loadXml(`${__dirname}/data/contacts_01.xml`)

    var cont = mapx.getContacts()[0]

    assert.equal(cont.function, 'Metadata Point of Contact')

    done()
})

it('#4 I2M Org as address', function(done) {
    var mapx = loadXml(`${__dirname}/data/contacts_01.xml`)

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
    var isoJson = createNormalizedIsoJson(mapx)
    var identNode = isoJson[MD_ROOT_NAME]['gmd:identificationInfo'][0][DATA_IDENT_NAME][0]
    var topic = identNode['gmd:topicCategory']
    assert.equal(topic, undefined)

    mapx.addTopic(MAPX.TOPICS[0])
    isoJson = createNormalizedIsoJson(mapx)
    identNode = isoJson[MD_ROOT_NAME]['gmd:identificationInfo'][0][DATA_IDENT_NAME][0]
    topic = identNode['gmd:topicCategory']
    assert.equal(1, topic.length)
    var catcode = topic[0]['gmd:MD_TopicCategoryCode']
    assert.equal(1, catcode.length)

    mapx.addTopic(MAPX.TOPICS[1])
    isoJson = createNormalizedIsoJson(mapx)
    identNode = isoJson[MD_ROOT_NAME]['gmd:identificationInfo'][0][DATA_IDENT_NAME][0]
    topic = identNode['gmd:topicCategory']
    assert.equal(2, topic.length)
    catcode = topic[0]['gmd:MD_TopicCategoryCode']
    assert.equal(1, catcode.length)
    assert.equal('biota', catcode)

    done()
})

it('#15 I2M Topic category', function(done) {

    var mapx = loadXml(`${__dirname}/data/contacts_01.xml`)
    var topics = mapx.getTopics()
    assert.equal(2, topics.length)

    done()
})

it('#14 M2I Check void language', function(done) {
    var mapx = new MAPX.MapX()
    mapx.setReleaseDate('2020-10-10') // avoid warn about missing date

    var iso = M2I.mapxToIso19139Internal(mapx)
    var xml = builder.create(iso, {
        encoding: 'utf-8'
    })
    var xmlFormatted = xml.end({
        pretty: true
    })

    var isoObj
    xml2js.parseString(xmlFormatted, function(err, isoJson) {
        if (err) {
            assert.fail(err)
        }
        isoObj = isoJson
    })
    assert.ok(isoObj)

    // forced language in metadata
    var mdRoot = isoObj[MD_ROOT_NAME]
    var mdLang = mdRoot['gmd:language'][0]['gmd:LanguageCode'][0]['$']['codeListValue']
    assert.equal(mdLang, 'eng')

    // forced language in resource
    var identNode = mdRoot['gmd:identificationInfo'][0][DATA_IDENT_NAME][0]
    var resLang = findFirstFromPath(identNode, ['gmd:language', 'gmd:LanguageCode'])
    assert.equal(resLang['$']['codeListValue'], 'eng')

    done()
})


function get_date_from_iso(isoXml) {
    const MD_ROOT_NAME = 'gmd:MD_Metadata'
    const DATA_IDENT_NAME = 'gmd:MD_DataIdentification'
    const CI_CITATION = 'gmd:CI_Citation'

    var ret = {}

    xml2js.parseString(isoXml, function(err, isoJson) {
        if (err) {
            assert.fail(err)
        }

        var mdRoot = isoJson[MD_ROOT_NAME]
        var identificationInfo = mdRoot['gmd:identificationInfo'][0]
        var identNode = identificationInfo[DATA_IDENT_NAME][0]
        // console.log("identNodeificationInfo[0] ", identNode);
        var dataCitationNode = getFirstFromPath(identNode, ['gmd:citation', CI_CITATION])
        // console.log("citation ", dataCitationNode);
        for (var date of dataCitationNode['gmd:date'] || []) {
            // console.log("date loop ", date);
            var typeNode = getFirstFromPath(date, ['gmd:CI_Date', 'gmd:dateType', 'gmd:CI_DateTypeCode'])
            var typeValue = typeNode.$.codeListValue

            var dateTimeVal = getFirstFromPath(date, ['gmd:CI_Date', 'gmd:date', 'gco:DateTime'])
            var dateVal = getFirstFromPath(date, ['gmd:CI_Date', 'gmd:date', 'gco:Date'])

            ret[typeValue] = dateVal || dateTimeVal
        }
    })

    return ret
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
        result = r
    })
    return result
}

function get_time_extent_from_iso(iso_xml) {
    const MD_ROOT_NAME = 'gmd:MD_Metadata'
    const DATA_IDENT_NAME = 'gmd:MD_DataIdentification'
    const CI_CITATION = 'gmd:CI_Citation'

    var ret = {}

    xml2js.parseString(iso_xml, function(err, isoJson) {
        if (err) {
            assert.fail(err)
        }

        var mdRoot = isoJson[MD_ROOT_NAME]
        var identificationInfo = mdRoot['gmd:identificationInfo'][0]
        var identNode = identificationInfo[DATA_IDENT_NAME][0]

        var timePeriod = findFirstFromPath(identNode, ['gmd:extent', 'gmd:EX_Extent', 'gmd:temporalElement', 'gmd:EX_TemporalExtent', 'gmd:extent', 'gml:TimePeriod'])

        if (timePeriod) {
            var optStart = timePeriod['gml:beginPosition']
            var optEnd = timePeriod['gml:endPosition']

            if (optStart) {
                ret.start = optStart
            }

            if (optEnd) {
                ret.end = optEnd
            }
        }
    })

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

function loadXml(source) {
    // const fs = require("fs");

    var xml = fs.readFileSync(source)
    var mapx = null
    xml2js.parseString(
        xml, {
            tagNameProcessors: [xml2js.processors.stripPrefix]
        },
        function(error, json) {
            if (error === null) {
                mapx = I2M.iso19139ToMapxInternal(json, null)
            } else {
                console.error(error)
                console.log(xml)
            }
        }
    )

    return mapx
}