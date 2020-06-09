/*
 */

import * as assert from 'assert'
import xml2js from 'xml2js'
import builder from 'xmlbuilder'
import fs from 'fs'

import * as M2I from '../src/convert_mapx_to_iso.js'
import * as I2M from '../src/convert_iso_to_mapx.js'
import * as MAPX from '../src/mapx.js'

import { dirname } from 'path'
import { fileURLToPath } from 'url'

const getFirstFromPath = I2M.getFirstFromPath
const findFirstFromPath = I2M.findFirstFromPath

const DATE_DEFAULT = '0001-01-01'
const MD_ROOT_NAME = 'gmd:MD_Metadata'
const DATA_IDENT_NAME = 'gmd:MD_DataIdentification'
const __dirname = dirname(fileURLToPath(import.meta.url))

it('Basic MAPX object parsing', function (done) {
  var mapx = create_sample_mapx()
  var json = JSON.stringify(mapx, null, 3)
  var pars = JSON.parse(json)

  assert.equal(MAPX.getTitle(mapx, 'en'), 'title', 'M title mismatch')
  assert.equal(MAPX.getTitle(pars, 'en'), 'title', 'P title mismatch')

  assert.equal(MAPX.getContacts(mapx)[0].function, 'func1', 'M func1 mismatch ' + JSON.stringify(MAPX.getContacts(mapx)[0]))
  assert.equal(MAPX.getContacts(pars)[0].function, 'func1', 'P func1 mismatch ' + JSON.stringify(MAPX.getContacts(pars)[0]))

  assert.equal(MAPX.getContacts(mapx)[1].function, 'func2', 'M func1 mismatch ' + JSON.stringify(MAPX.getContacts(mapx)[1]))
  assert.equal(MAPX.getContacts(pars)[1].function, 'func2', 'P func1 mismatch ' + JSON.stringify(MAPX.getContacts(pars)[1]))

  done()
})

it('MAPX to ISO parsing', function (done) {
  var mapx = create_sample_mapx()

  var iso = M2I.mapxToIso19139Internal(mapx)

  // nst builder = require('xmlbuilder');

  var xml = builder.create(iso, { encoding: 'utf-8' })
  var xmlFormatted = xml.end({ pretty: true })
  // console.log("METADATA as XML", xmlFormatted);
  done()
})

it('Check M2I dates', function (done) {
  var mapx = create_sample_mapx()

  var iso = M2I.mapxToIso19139Internal(mapx)
  var xml = builder.create(iso, { encoding: 'utf-8' })
  var xmlFormatted = xml.end({ pretty: true })

  var dates = get_date_from_iso(xmlFormatted)

  assert.equal(dates.publication, '2019-01-01')
  assert.equal(dates.revision, '2019-05-01')

  done()
})

it('Check void M2I dates', function (done) {
  var mapx = MAPX.createObject()

  var iso = M2I.mapxToIso19139Internal(mapx)
  var xml = builder.create(iso, { encoding: 'utf-8' })
  var xmlFormatted = xml.end({ pretty: true })

  var dates = get_date_from_iso(xmlFormatted)

  assert.equal(Object.keys(dates).length, 0)

  done()
})

it('Check equals M2I dates', function (done) {
  var mapx = MAPX.createObject()

  MAPX.setModifiedDate(mapx, '2019-09-25')
  MAPX.setReleaseDate(mapx, '2019-09-25')

  var iso = M2I.mapxToIso19139Internal(mapx)
  var xml = builder.create(iso, { encoding: 'utf-8' })
  var xmlFormatted = xml.end({ pretty: true })

  var dates = get_date_from_iso(xmlFormatted)

  assert.equal(Object.keys(dates).length, 1)
  assert.equal(dates.publication, '2019-09-25')

  done()
})

it('Check begin time extent', function (done) {
  var mapx = create_sample_mapx()
  MAPX.setTemporalStart(mapx, '2019-09-26')

  var iso = M2I.mapxToIso19139Internal(mapx)
  var xml = builder.create(iso, { encoding: 'utf-8' })
  var xmlFormatted = xml.end({ pretty: true })
  //    console.log("ISO ", xmlFormatted);

  var dates = get_time_extent_from_iso(xmlFormatted)

  assert.equal(Object.keys(dates).length, 1)
  assert.equal(dates.start, '2019-09-26')

  done()
})

it('#5 M2I check default date mapping', function (done) {
  var mapx = create_sample_mapx()
  assert.equal(true, MAPX.isTimeless(mapx))

  var isoJson = createNormalizedIsoJson(mapx)
  var identNode = isoJson[MD_ROOT_NAME]['gmd:identificationInfo'][0][DATA_IDENT_NAME][0]
  var timeExtent = findFirstFromPath(identNode, ['gmd:extent', 'gmd:EX_Extent', 'gmd:temporalElement'])
  assert.ok(typeof timeExtent === 'undefined')

  mapx = create_sample_mapx()
  MAPX.setTemporalStart(mapx, '2019-09-26')
  isoJson = createNormalizedIsoJson(mapx)
  identNode = isoJson[MD_ROOT_NAME]['gmd:identificationInfo'][0][DATA_IDENT_NAME][0]
  timeExtent = findFirstFromPath(identNode, ['gmd:extent', 'gmd:EX_Extent', 'gmd:temporalElement'])
  assert.ok(typeof timeExtent !== 'undefined')

  mapx = create_sample_mapx()
  MAPX.setTemporalStart(mapx, DATE_DEFAULT)
  isoJson = createNormalizedIsoJson(mapx)
  identNode = isoJson[MD_ROOT_NAME]['gmd:identificationInfo'][0][DATA_IDENT_NAME][0]
  timeExtent = findFirstFromPath(identNode, ['gmd:extent', 'gmd:EX_Extent', 'gmd:temporalElement'])
  assert.ok(typeof timeExtent === 'undefined')

  done()
})

it('#7 M2I add annexes', function (done) {
  var mapx = create_sample_mapx()
  assert.equal(3, MAPX.getReferences(mapx).length)
  assert.equal('ref3', MAPX.getReferences(mapx)[2])

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
    if (name === 'Annex') { annex_cnt++ }
  }

  assert.equal(3, annex_cnt)

  done()
})

it('#8 M2I constraints semicolon', function (done) {
  var mapx = create_sample_mapx()
  assert.equal(3, MAPX.getLicenses(mapx).length)

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

it('#9 M2I point of contact', function (done) {
  var mapx = create_sample_mapx()
  MAPX.addContact(mapx, 'metadata f1', 'name1', 'addr1', 'mail@mail1')
  MAPX.addContact(mapx, 'metadata f2', 'name2', 'addr2', 'mail@mail2')

  assert.equal(5, MAPX.getContacts(mapx).length)
  var isoJson = createNormalizedIsoJson(mapx)

  var md_contacts = isoJson[MD_ROOT_NAME]['gmd:contact']
  assert.equal(5, md_contacts.length)

  var identNode = isoJson[MD_ROOT_NAME]['gmd:identificationInfo'][0][DATA_IDENT_NAME][0]
  var data_poc = identNode['gmd:pointOfContact']
  assert.equal(3, data_poc.length)

  done()
})

it('#1 I2M dates', function (done) {
  var mapx = loadXml(__dirname + '/data/no_pubdate_yes_revision.xml')

  assert.equal(MAPX.getReleaseDate(mapx), DATE_DEFAULT)
  assert.equal(MAPX.getModifiedDate(mapx), '2015-07-14')

  mapx = loadXml(__dirname + '/data/no_pubdate_no_revision.xml')

  assert.equal(MAPX.getReleaseDate(mapx), '2020-01-01')
  assert.equal(MAPX.getModifiedDate(mapx), DATE_DEFAULT)

  done()
})

it('#2 I2M comma separated contacts', function (done) {
  var mapx = loadXml(__dirname + '/data/contacts_01.xml')

  var cont = MAPX.getContacts(mapx)[0]

  assert.equal(cont.name, 'CTO')

  done()
})

it('#3 I2M role codes', function (done) {
  var mapx = loadXml(__dirname + '/data/contacts_01.xml')

  var cont = MAPX.getContacts(mapx)[0]

  assert.equal(cont.function, 'Metadata Point of Contact')

  done()
})

it('#4 I2M Org as address', function (done) {
  var mapx = loadXml(__dirname + '/data/contacts_01.xml')

  var cont = MAPX.getContacts(mapx)[1]

  assert.ok(!cont.name.includes('Bren School'))
  assert.ok(cont.address.startsWith('Bren School'))

  done()
})

it('#1 Other - parse date', function (done) {
  assert.ok(MAPX.checkDate('2020-06-09'))
  assert.ok(MAPX.checkDate('2020-06-09T12:00:00'))
  assert.ok(MAPX.checkDate('2020-06-09T12:00'))

  assert.ok(!MAPX.checkDate('2020'))
  assert.ok(!MAPX.checkDate('2020-41-09'))
  assert.ok(!MAPX.checkDate('2020-11-39'))

  done()
})

function get_date_from_iso (isoXml) {
  const MD_ROOT_NAME = 'gmd:MD_Metadata'
  const DATA_IDENT_NAME = 'gmd:MD_DataIdentification'
  const CI_CITATION = 'gmd:CI_Citation'

  var ret = {}

  xml2js.parseString(isoXml, function (err, isoJson) {
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

function createNormalizedIsoJson (mapx) {
  var iso = M2I.mapxToIso19139Internal(mapx)
  var xml = builder.create(iso, { encoding: 'utf-8' })
  var xmlFormatted = xml.end({ pretty: true })

  var result
  //    var prc = {tagNameProcessors: [xml2js.processors.stripPrefix]};
  new xml2js.Parser().parseString(xmlFormatted, (e, r) => { result = r })
  return result
}

function get_time_extent_from_iso (iso_xml) {
  const MD_ROOT_NAME = 'gmd:MD_Metadata'
  const DATA_IDENT_NAME = 'gmd:MD_DataIdentification'
  const CI_CITATION = 'gmd:CI_Citation'

  var ret = {}

  xml2js.parseString(iso_xml, function (err, isoJson) {
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

      if (optStart) { ret.start = optStart }

      if (optEnd) { ret.end = optEnd }
    }
  })

  return ret
}

function create_sample_mapx () {
  var mapx = MAPX.createObject()

  MAPX.addContact(mapx, 'func1', 'name1', 'addr1', 'mail@mail1')
  MAPX.addContact(mapx, 'func2', 'name2', 'addr2', 'mail@mail2')
  MAPX.addContact(mapx, 'func3', 'name3', 'addr3', 'mail@mail3')

  MAPX.addKeyword(mapx, 'kw1')
  MAPX.addKeyword(mapx, 'kw2')

  MAPX.addLanguage(mapx, 'en')

  MAPX.addLicense(mapx, 'licname1', 'lictext1')
  MAPX.addLicense(mapx, 'licname2', 'lictext2')
  MAPX.addLicense(mapx, '', 'lictext3')

  MAPX.setNotes(mapx, 'en', 'note1', 'textnote1')

  MAPX.addReference(mapx, 'ref1')
  MAPX.addReference(mapx, 'ref2')
  MAPX.addReference(mapx, 'ref3')

  MAPX.addSource(mapx, 'http://source1', true)
  MAPX.addSource(mapx, 'http://source2', false)

  MAPX.setAbstract(mapx, 'en', 'very abstract')
  MAPX.setBBox(mapx, -10, 10, -20, 20)
  MAPX.setCrs(mapx, 'EPSG:4326', 'http://epsg/4326')
  MAPX.setHomepage(mapx, 'http://homepage')
  MAPX.setModifiedDate(mapx, '2019-05-01')
  MAPX.setPeriodicity(mapx, 'daily')
  MAPX.setReleaseDate(mapx, '2019-01-01')
  MAPX.setTitle(mapx, 'en', 'title')

  return mapx
}

function loadXml (source) {
  // const fs = require("fs");

  var xml = fs.readFileSync(source)
  var mapx = null
  xml2js.parseString(
    xml,
    {
      tagNameProcessors: [xml2js.processors.stripPrefix]
    },
    function (error, json) {
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
