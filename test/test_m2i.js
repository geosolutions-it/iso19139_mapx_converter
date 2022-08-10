/*
 */

//import * as assert from 'assert'
import chai from 'chai'
const assert = chai.assert

import builder from 'xmlbuilder'

import * as M2I from '../src/convert_mapx_to_iso.js'
import * as I2M from '../src/convert_iso_to_mapx.js'
import * as MAPX from '../src/mapx.js'
import * as UTILS from '../src/mapx_utils.js'
import * as TU from './utils.js'


import {
    dirname
} from 'path'
import {
    fileURLToPath
} from 'url'
const __dirname = dirname(fileURLToPath(
    import.meta.url))

const getFirstFromPath = I2M.getFirstFromPath
const findFirstFromPath = I2M.findFirstFromPath


it('Basic MAPX object parsing', function(done) {
    var mapx = TU.create_sample_mapx()

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

it('M2I parsing', function(done) {
    var mapx = TU.create_sample_mapx()

    var iso = M2I.mapxToIso19139Internal(mapx)

    var xml = builder.create(iso, {
        encoding: 'utf-8'
    })
    var xmlFormatted = xml.end({
        pretty: true
    })
    if (TU.VERBOSE)
        console.log("METADATA as XML", xmlFormatted);
    done()
})

it('Check M2I dates', function(done) {
    var mapx = TU.create_sample_mapx()

    var iso = M2I.mapxToIso19139Internal(mapx)
    var xml = builder.create(iso, {
        encoding: 'utf-8'
    })
    var xmlFormatted = xml.end({
        pretty: true
    })

    var dates = TU.get_date_from_iso(xmlFormatted)

    assert.equal(dates.publication, '2019-01-01')
    assert.equal(dates.revision, '2019-05-01')

    done()
})

it('Check void M2I dates', function(done) {
    var mapx = new MAPX.MapX()
    mapx.addLanguage('en') // avoid warn about missing language

    var mh = new TU.TestMessageHandler()
    mapx.setLogger(mh)

    var iso = M2I.mapxToIso19139Internal(mapx, {[UTILS.PARAM_MESSAGE_HANDLER]: mh})
    var xml = builder.create(iso, {
        encoding: 'utf-8'
    })
    var xmlFormatted = xml.end({
        pretty: true
    })

    var dates = TU.get_date_from_iso(xmlFormatted)

    assert.equal(Object.keys(dates).length, 1) // 1: forced date in identification for validity + datestamp
    assert.ok(dates['datestamp']) // make sure datestmap is there

    assert.include(mh.messages, `No dataset reference date given.`)

    done()
})

it('Check equals M2I dates', function(done) {
    var mapx = new MAPX.MapX()
    mapx.setLogger(new TU.TestMessageHandler())

    mapx.setModifiedDate('2019-09-25')
    mapx.setReleaseDate('2019-09-25')

    var iso = M2I.mapxToIso19139Internal(mapx, {[UTILS.PARAM_MESSAGE_HANDLER]: mapx.logger})
    var xml = builder.create(iso, {
        encoding: 'utf-8'
    })
    var xmlFormatted = xml.end({
        pretty: true
    })

    var dates = TU.get_date_from_iso(xmlFormatted)

    assert.equal(Object.keys(dates).length, 2)
    assert.equal(dates.publication, '2019-09-25')
    assert.ok(dates['datestamp']) // make sure datestmap is there

    done()
})

it('Check begin time extent', function(done) {
    var mapx = TU.create_sample_mapx()
    mapx.setTemporalStart('2019-09-26')

    var iso = M2I.mapxToIso19139Internal(mapx, {[UTILS.PARAM_MESSAGE_HANDLER]: mapx.logger})
    var xml = builder.create(iso, {
        encoding: 'utf-8'
    })
    var xmlFormatted = xml.end({
        pretty: true
    })
    //    console.log("ISO ", xmlFormatted);

    var dates = TU.get_time_extent_from_iso(xmlFormatted)

    assert.equal(Object.keys(dates).length, 1)
    assert.equal(dates.start, '2019-09-26')

    done()
})

it('#5 M2I check default date mapping', function(done) {
    var mapx = TU.create_sample_mapx()
    assert.equal(true, mapx.isTimeless())

    var isoJson = TU.createStrippedIsoJson(mapx)
    var identNode = isoJson[TU.MD_ROOT_NAME]['identificationInfo'][0][TU.DATA_IDENT_NAME][0]
    var timeExtent = findFirstFromPath(identNode, ['extent', 'EX_Extent', 'temporalElement'])
    assert.ok(typeof timeExtent === 'undefined')

    mapx = TU.create_sample_mapx()
    mapx.setTemporalStart('2019-09-26')
    isoJson = TU.createStrippedIsoJson(mapx)
    identNode = isoJson[TU.MD_ROOT_NAME]['identificationInfo'][0][TU.DATA_IDENT_NAME][0]
    timeExtent = findFirstFromPath(identNode, ['extent', 'EX_Extent', 'temporalElement'])
    assert.ok(typeof timeExtent !== 'undefined')

    mapx = TU.create_sample_mapx()
    mapx.setTemporalStart(TU.DATE_DEFAULT)
    isoJson = TU.createStrippedIsoJson(mapx)
    identNode = isoJson[TU.MD_ROOT_NAME]['identificationInfo'][0][TU.DATA_IDENT_NAME][0]
    timeExtent = findFirstFromPath(identNode, ['extent', 'EX_Extent', 'temporalElement'])
    assert.ok(typeof timeExtent === 'undefined')

    done()
})

it('#7 M2I add annexes', function(done) {
    var mapx = TU.create_sample_mapx()
    assert.equal(3, mapx.getReferences().length)
    assert.equal('ref3', mapx.getReferences()[2])

    var isoJson = TU.createStrippedIsoJson(mapx)
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
    var mapx = TU.create_sample_mapx()
    assert.equal(3, mapx.getLicenses().length)

    var isoJson = TU.createStrippedIsoJson(mapx)
    var identNode = isoJson[TU.MD_ROOT_NAME]['identificationInfo'][0][TU.DATA_IDENT_NAME][0]
    var legalNode = identNode['resourceConstraints'][0]['MD_LegalConstraints'][0]
    // console.log("MD_LegalConstraints ---> ", JSON.stringify(legalNode,null,3));
    var otherNode = legalNode['otherConstraints']
    assert.equal(3, otherNode.length)
    assert.equal('licname1: lictext1', otherNode[0]['CharacterString'][0])
    assert.equal('lictext3', otherNode[2]['CharacterString'][0])

    done()
})

it('#9 M2I point of contact', function(done) {
    var mapx = TU.create_sample_mapx()
    mapx.addContact('metadata f1', 'name1', 'addr1', 'mail@mail1')
    mapx.addContact('metadata f2', 'name2', 'addr2', 'mail@mail2')

    assert.equal(5, mapx.getContacts().length)
    var isoJson = TU.createStrippedIsoJson(mapx)

    var md_contacts = isoJson[TU.MD_ROOT_NAME]['contact']
    assert.equal(5, md_contacts.length)

    var identNode = isoJson[TU.MD_ROOT_NAME]['identificationInfo'][0][TU.DATA_IDENT_NAME][0]
    var data_poc = identNode['pointOfContact']
    assert.equal(3, data_poc.length)

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
    var mapx = TU.create_sample_mapx()
    var isoJson = TU.createStrippedIsoJson(mapx)
    var identNode = isoJson[TU.MD_ROOT_NAME]['identificationInfo'][0][TU.DATA_IDENT_NAME][0]
    var topic = identNode['topicCategory']
    assert.equal(topic, undefined)

    mapx.addTopic(MAPX.TOPICS[0])
    isoJson = TU.createStrippedIsoJson(mapx)
    identNode = isoJson[TU.MD_ROOT_NAME]['identificationInfo'][0][TU.DATA_IDENT_NAME][0]
    topic = identNode['topicCategory']
    assert.equal(1, topic.length)
    var catcode = topic[0]['MD_TopicCategoryCode']
    assert.equal(1, catcode.length)

    mapx.addTopic(MAPX.TOPICS[1])
    isoJson = TU.createStrippedIsoJson(mapx)
    identNode = isoJson[TU.MD_ROOT_NAME]['identificationInfo'][0][TU.DATA_IDENT_NAME][0]
    topic = identNode['topicCategory']
    assert.equal(2, topic.length)
    catcode = topic[0]['MD_TopicCategoryCode']
    assert.equal(1, catcode.length)
    assert.equal('biota', catcode)

    done()
})

it('#14 M2I Check void language', function(done) {
    var mapx = new MAPX.MapX()
    mapx.setLogger(new TU.TestMessageHandler())

    // mapx.setReleaseDate('2020-10-10') // avoid warn about missing date
    var isoObj = TU.createStrippedIsoJson(mapx)

    // forced language in metadata
    var mdRoot = isoObj[TU.MD_ROOT_NAME]
    var mdLang = mdRoot['language'][0]['LanguageCode'][0]['$']['codeListValue']
    assert.equal(mdLang, 'eng')

    // forced language in resource
    var identNode = mdRoot['identificationInfo'][0][TU.DATA_IDENT_NAME][0]
    var resLang = findFirstFromPath(identNode, ['language', 'LanguageCode'])
    assert.equal(resLang['$']['codeListValue'], 'eng')

    done()
})

it('#37 M2I Check void attributes', function(done) {
    var mapx = new MAPX.MapX()
    var logger = new TU.TestMessageHandler()
    mapx.setLogger(logger)

    assert.isOk(mapx.mapx.text)
    assert.isOk(mapx.mapx.text.attributes)
    delete mapx.mapx.text.attributes
    assert.isUndefined(mapx.mapx.text.attributes)

    var isoObj = TU.createStrippedIsoJson(mapx)
    assert.isOk(isoObj)
    assert.equal(3, logger.messages.length, "Bad number of warn messages" + JSON.stringify(logger.messages, null, 3))
    assert.ok(logger.messages[logger.messages.length-1].includes("Attributes "))

    done()
})


it('Attributes codec: supplementalInfo', function(done) {
    var mapx = new MAPX.MapX()
    mapx.setLogger(new TU.TestMessageHandler())

    mapx.setNotes('en', 'note00')

    mapx.setAttribute('en', 'name1', 'value1')
    mapx.setAttribute('en', 'name2', 'value2')
    mapx.setAttribute('en', 'name3', null)
    mapx.setAttribute('en', 'name:4', 'value:4')

    var isoObj = TU.createStrippedIsoJson(mapx)
    var mdRoot = isoObj[TU.MD_ROOT_NAME]
    var identNode = mdRoot['identificationInfo'][0][TU.DATA_IDENT_NAME][0]
    var suppInfo = getFirstFromPath(identNode, ['supplementalInformation', TU.GCO_CHAR_NAME])
    //    console.log("SUPP INFO ---> ", JSON.stringify(suppInfo,null,3));

    const expectedSuppInfo = 'note00\nAttributes description: name1: value1; name2: value2; name3; name::4: value::4;'

    assert.equal(suppInfo, expectedSuppInfo, "Error encoding M2I")

    // == convert back to mapx
    var mapx2 = I2M.iso19139ToMapxInternal(TU.createStrippedIsoJson(mapx), {[UTILS.PARAM_MESSAGE_HANDLER]: mapx.logger})
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


it('#38 M2I extreme', function(done) {
    var mapxText = TU.loadFromFile(`${__dirname}/data/extreme.json`)

    var logger = new TU.TestMessageHandler()

    var mapxObj = JSON.parse(mapxText)
    new MAPX.MapX(mapxObj, logger)  // try parsing

    // console.warn(JSON.stringify(mapx.mapx, null, 3))

    assert.equal(10, logger.messages.length, 'Wrong number of warnings during parsing')

    done()
})

it('#39 select language', function(done) {
    var mapx = new MAPX.MapX()
    var logger = new TU.TestMessageHandler()
    mapx.setLogger(logger)

    mapx.addLanguage('de')
    mapx.setTitle('fr', 'FRE_TITLE')
    mapx.setAbstract('ar', 'ARA_ABSTRACT')

    assert.deepEqual(M2I.getUsedLanguages(mapx), new Set(['fr','ar']), "Bad computed lang list")
    assert.equal(M2I.extractLocalized(mapx.getAllTitles(), 'fr', logger), 'FRE_TITLE')
    assert.equal(M2I.extractLocalized(mapx.getAllTitles(), 'ar', logger), 'FRE_TITLE')


    var isoObj = TU.createStrippedIsoJson(mapx)
    assert.equal(TU.get_title_from_iso_obj(isoObj), 'FRE_TITLE', 'Title mismatch')
    assert.equal(TU.get_abstract_from_iso_obj(isoObj), 'ARA_ABSTRACT', 'Abstract mismatch')
    assert.oneOf(TU.get_metadata_language_from_iso_obj(isoObj), ['fra','ara'], 'Bad language mapped')

    mapx.setNotes('en', 'ENG_NOTES')

    isoObj = TU.createStrippedIsoJson(mapx)
    assert.equal(TU.get_metadata_language_from_iso_obj(isoObj), 'eng', '"eng" should be the preferred language')

    done()
})

it('#43 M2I attrib parsing', function(done) {
    var mapxText = TU.loadFromFile(`${__dirname}/data/43_attrib.json`)

    var logger = new TU.TestMessageHandler()

    var mapxObj = JSON.parse(mapxText)
    new MAPX.MapX(mapxObj, logger) // try parsing

    done()
})