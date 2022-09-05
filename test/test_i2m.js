/*
 */

import chai from 'chai'
const assert = chai.assert

import * as I2M from '../src/convert_iso_to_mapx.js'
import * as TU from './utils.js'

import {
    dirname
} from 'path'
import {
    fileURLToPath
} from 'url'
const __dirname = dirname(fileURLToPath(
    import.meta.url))



it('#33 I2M dates', function(done) {

    var logger = new TU.TestMessageHandler()

    var isoxml = TU.loadFromFile(`${__dirname}/data/no_pubdate_yes_revision.xml`)
    assert.ok(isoxml)
    var isoObj = TU.xml2json(isoxml)
    assert.ok(isoObj)

    var CREATION = '2020-01-01'
    var REVISION = '2020-02-01'
    var PUBLICATION = '2020-03-01'
    var METADATA = '2020-04-01'
    var DATE_DEFAULT = '0001-01-01'
    var OLD_DATE = '1900-01-01'
    var OLD_DATETIME = '1900-02-02T12:00:00'
    var OLD_DATETIME_TRUNC = '1900-02-02'

    TU.set_date_into_iso(isoObj, METADATA, CREATION, REVISION, PUBLICATION)

    // check dates are where we expect them
    logger.log("#33 TEST0")
    var dates = TU.get_date_from_iso_obj(isoObj)
    assert.equal(dates.creation, CREATION)
    assert.equal(dates.revision, REVISION)
    assert.equal(dates.publication, PUBLICATION)
    assert.equal(dates.datestamp, METADATA)

    logger.log("#33 TEST1")
    assertDates(isoObj, PUBLICATION, REVISION)

    logger.log("#33 TEST2")
    TU.set_date_into_iso(isoObj, METADATA, CREATION, 'pippo', PUBLICATION)
    assertDates(isoObj, PUBLICATION, DATE_DEFAULT)

    logger.log("#33 TEST3")
    TU.set_date_into_iso(isoObj, METADATA, CREATION, 'pippo', undefined)
    assertDates(isoObj, CREATION, DATE_DEFAULT)

    logger.log("#33 TEST4")
    TU.set_date_into_iso(isoObj, METADATA, undefined, undefined, undefined)
    assertDates(isoObj, METADATA, DATE_DEFAULT)

    logger.log("#33 TEST5")
    TU.set_date_into_iso(isoObj, METADATA, CREATION, REVISION, undefined)
    assertDates(isoObj, CREATION, REVISION)

    logger.log("#33 TEST6")
    TU.set_date_into_iso(isoObj, METADATA, undefined, REVISION, undefined)
    assertDates(isoObj, DATE_DEFAULT, REVISION)

    logger.log("#33 TEST7")
    TU.set_date_into_iso(isoObj, OLD_DATE, undefined, REVISION, undefined)
    assertDates(isoObj, OLD_DATE, REVISION)

    logger.log("#33 TEST8")
    TU.set_date_into_iso(isoObj, OLD_DATETIME, undefined, REVISION, undefined)
    assertDates(isoObj, OLD_DATETIME_TRUNC, REVISION)

    done()
})


function assertDates(isoObj, released, modified) {
    var mapx = I2M.iso19139ToMapxInternal(isoObj, TU.createTestParams())

    assert.equal(mapx.getReleaseDate(), released)
    assert.equal(mapx.getModifiedDate(), modified)
}

it('#2 I2M comma separated contacts', function(done) {
    var mapx = TU.loadXmlAndTransform(`${__dirname}/data/contacts_01.xml`)

    var cont = mapx.getContacts()[0]

    assert.equal(cont.name, 'CTO')

    done()
})

it('#3 I2M role codes', function(done) {
    var mapx = TU.loadXmlAndTransform(`${__dirname}/data/contacts_01.xml`)

    var cont = mapx.getContacts()[0]

    assert.equal(cont.function, 'Metadata Point of Contact')

    done()
})

it('#4 I2M Org as address', function(done) {
    var mapx = TU.loadXmlAndTransform(`${__dirname}/data/contacts_01.xml`)

    var cont = mapx.getContacts()[1]

    assert.ok(!cont.name.includes('Bren School'))
    assert.ok(cont.address.startsWith('Bren School'))

    done()
})


it('#15 I2M Topic category', function(done) {
    var mapx = TU.loadXmlAndTransform(`${__dirname}/data/contacts_01.xml`)
    var topics = mapx.getTopics()
    assert.equal(2, topics.length)

    done()
})


it('I2M Attributes codec: parser', function(done) {

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


it('#32 I2M parse Bathymetrie', function(done) {

    var mapx = TU.loadXmlAndTransform(`${__dirname}/data/bathymetrie.xml`)
    assert.ok(mapx)

    done()
})

it('#32 I2M parse missing MD_DataIdentification', function(done) {

    var isoxml = TU.loadFromFile(`${__dirname}/data/contacts_01.xml`)
    assert.ok(isoxml)
    var isojsn = TU.xml2json(isoxml)
    assert.ok(isojsn)

    // console.log(isojsn['MD_Metadata']['identificationInfo'])
    assert.ok(isojsn['MD_Metadata']['identificationInfo'][0]['MD_DataIdentification'])
    delete isojsn['MD_Metadata']['identificationInfo'][0]['MD_DataIdentification']
    var mapx = I2M.iso19139ToMapxInternal(isojsn, TU.createTestParams())
    assert.ok(mapx)

    done()
})

it('#32 I2M parse missing identificationInfo', function(done) {

    var isoxml = TU.loadFromFile(`${__dirname}/data/contacts_01.xml`)
    assert.ok(isoxml)
    var isojsn = TU.xml2json(isoxml)
    assert.ok(isojsn)

    assert.ok(isojsn['MD_Metadata']['identificationInfo'])
    delete isojsn['MD_Metadata']['identificationInfo']
    var mapx = I2M.iso19139ToMapxInternal(isojsn, TU.createTestParams())
    assert.ok(mapx)

    done()
})

it('#32 I2M parse bad xml', function(done) {

    var isoxml = 'This is not an xml document'
    var mapx = I2M.iso19139ToMapx(isoxml, TU.createTestParams())
    assert.isNull(mapx)

    done()
})

it('#45 I2M language handling', function(done) {

    var isoxml = TU.loadFromFile(`${__dirname}/data/5_french_language.xml`)
    assert.ok(isoxml, "Error loading file")
    var iso = TU.xml2json(isoxml)
    assert.ok(iso)

    var logger = new TU.TestMessageHandler()
    var mapx = I2M.iso19139ToMapxInternal(iso, TU.createLoggerParams(logger))
    assert.ok(mapx)

    assert.equal(logger.messages.length, 1)
    assert.include(logger.messages[0], 'English metadata were not found')

    assert.deepEqual(mapx.getLanguages(), ['ar', 'de'], 'Bad data language mapped')

    done()
})