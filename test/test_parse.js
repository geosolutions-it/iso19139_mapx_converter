/*
 */

import * as assert from "assert";
import xml2js from "xml2js";
import builder from "xmlbuilder";
import fs from "fs";

import * as M2I from "../convert_mapx_to_iso.js";
import * as I2M from "../convert_iso_to_mapx.js";
import * as MAPX from "../mapx.js";


const getFirstFromPath = I2M.getFirstFromPath;
const findFirstFromPath = I2M.findFirstFromPath;


const DATE_DEFAULT = "0001-01-01";
const MD_ROOT_NAME = 'gmd:MD_Metadata';
const DATA_IDENT_NAME = 'gmd:MD_DataIdentification';


import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

it('Basic MAPX object parsing', function(done) {

    var mapx = create_sample_mapx();
    var json = JSON.stringify(mapx, null, 3);
    var pars = JSON.parse(json);


    assert.equal(MAPX.get_title(mapx,"en"), "title", "M title mismatch");
    assert.equal(MAPX.get_title(pars,"en"), "title", "P title mismatch");

    assert.equal(MAPX.get_contacts(mapx)[0]["function"], "func1", "M func1 mismatch " + JSON.stringify(MAPX.get_contacts(mapx)[0]));
    assert.equal(MAPX.get_contacts(pars)[0]["function"], "func1", "P func1 mismatch " + JSON.stringify(MAPX.get_contacts(pars)[0]));

    assert.equal(MAPX.get_contacts(mapx)[1]["function"], "func2", "M func1 mismatch " + JSON.stringify(MAPX.get_contacts(mapx)[1]));
    assert.equal(MAPX.get_contacts(pars)[1]["function"], "func2", "P func1 mismatch " + JSON.stringify(MAPX.get_contacts(pars)[1]));

    done();
});


it('MAPX to ISO parsing', function(done) {

    var mapx = create_sample_mapx();

    var iso = M2I.mapx_to_iso19139(mapx);

    // nst builder = require('xmlbuilder');
    
    var xml = builder.create(iso, { encoding: 'utf-8' });
    var xmlFormatted = xml.end({ pretty: true });
    // console.log("METADATA as XML", xmlFormatted);
    done();
});


it('Check M2I dates', function(done) {

    var mapx = create_sample_mapx();

    var iso = M2I.mapx_to_iso19139(mapx);
    var xml = builder.create(iso, { encoding: 'utf-8' });
    var xmlFormatted = xml.end({ pretty: true });

    var dates = get_date_from_iso(xmlFormatted);

    assert.equal(dates['publication'],"2019-01-01");
    assert.equal(dates['revision'],"2019-05-01");

    done();
});


it('Check void M2I dates', function(done) {
    var mapx = MAPX.create_object();

    var iso = M2I.mapx_to_iso19139(mapx);
    var xml = builder.create(iso, { encoding: 'utf-8' });
    var xmlFormatted = xml.end({ pretty: true });

    var dates = get_date_from_iso(xmlFormatted);

    assert.equal(Object.keys(dates).length, 0);

    done();
});


it('Check equals M2I dates', function(done) {
    var mapx = MAPX.create_object();

    MAPX.set_modified_date(mapx, "2019-09-25");
    MAPX.set_release_date(mapx, "2019-09-25");

    var iso = M2I.mapx_to_iso19139(mapx);
    var xml = builder.create(iso, { encoding: 'utf-8' });
    var xmlFormatted = xml.end({ pretty: true });

    var dates = get_date_from_iso(xmlFormatted);

    assert.equal(Object.keys(dates).length, 1);
    assert.equal(dates['publication'],"2019-09-25");

    done();
});


it('Check begin time extent', function(done) {

    var mapx = create_sample_mapx();
    MAPX.set_temporal_start(mapx, "2019-09-26");

    var iso = M2I.mapx_to_iso19139(mapx);
    var xml = builder.create(iso, { encoding: 'utf-8' });
    var xmlFormatted = xml.end({ pretty: true });
//    console.log("ISO ", xmlFormatted);

    var dates = get_time_extent_from_iso(xmlFormatted);

    assert.equal(Object.keys(dates).length, 1);
    assert.equal(dates['start'],"2019-09-26");

    done();
});

it('#5 M2I check default date mapping', function(done) {

    var mapx = create_sample_mapx();
    assert.equal(true, MAPX.is_timeless(mapx));

    var iso_json = create_nomalized_iso_json(mapx);
    var identNode = iso_json[MD_ROOT_NAME]['gmd:identificationInfo'][0][DATA_IDENT_NAME][0];
    var timeExtent = findFirstFromPath(identNode, [ "gmd:extent", "gmd:EX_Extent", "gmd:temporalElement"]);
    assert.ok(typeof timeExtent === "undefined");

    mapx = create_sample_mapx();
    MAPX.set_temporal_start(mapx, "2019-09-26");
    iso_json = create_nomalized_iso_json(mapx);
    identNode = iso_json[MD_ROOT_NAME]['gmd:identificationInfo'][0][DATA_IDENT_NAME][0];
    timeExtent = findFirstFromPath(identNode, [ "gmd:extent", "gmd:EX_Extent", "gmd:temporalElement"]);
    assert.ok(typeof timeExtent !== "undefined");        

    mapx = create_sample_mapx();
    MAPX.set_temporal_start(mapx, DATE_DEFAULT);
    iso_json = create_nomalized_iso_json(mapx);
    identNode = iso_json[MD_ROOT_NAME]['gmd:identificationInfo'][0][DATA_IDENT_NAME][0];
    timeExtent = findFirstFromPath(identNode, [ "gmd:extent", "gmd:EX_Extent", "gmd:temporalElement"]);
    assert.ok(typeof timeExtent === "undefined");    

    done();
});

it('#7 M2I add annexes', function(done) {

    var mapx = create_sample_mapx();
    assert.equal(3, MAPX.get_references(mapx).length);
    assert.equal("ref3", MAPX.get_references(mapx)[2]);

    var iso_json = create_nomalized_iso_json(mapx);
    const MD_ROOT_NAME = 'gmd:MD_Metadata';

    var distrNode = iso_json[MD_ROOT_NAME]['gmd:distributionInfo'][0]["gmd:MD_Distribution"][0];
    var transfNode = distrNode['gmd:transferOptions'][0]['gmd:MD_DigitalTransferOptions'][0];
    // console.log("MD_DigitalTransferOptions ---> ", JSON.stringify(transfNode));
    var onlineNodes = transfNode['gmd:onLine']; // [0]['gmd:CI_OnlineResource'];
    // console.log("CI_OnlineResource ---> ", JSON.stringify(onlineNodes));

    assert.equal(6, onlineNodes.length);

    var annex_cnt = 0;
    for (var res of onlineNodes) {
         // console.log("RES is ", JSON.stringify(res));
        var name = res
            ["gmd:CI_OnlineResource"][0]
            ["gmd:name"][0]
            ["gco:CharacterString"][0];
        if(name == 'Annex')
            annex_cnt++;
    }

    assert.equal(3, annex_cnt);

    done();
});

it('#8 M2I constraints semicolon', function(done) {

    var mapx = create_sample_mapx();
    assert.equal(3, MAPX.get_licenses(mapx).length);

    var iso_json = create_nomalized_iso_json(mapx);
    var identNode = iso_json[MD_ROOT_NAME]['gmd:identificationInfo'][0][DATA_IDENT_NAME][0];
    var legalNode = identNode["gmd:resourceConstraints"][0]["gmd:MD_LegalConstraints"][0];
    // console.log("MD_LegalConstraints ---> ", JSON.stringify(legalNode,null,3));
    var otherNode = legalNode["gmd:otherConstraints"];
    assert.equal(3, otherNode.length);
    assert.equal('licname1: lictext1', otherNode[0]['gco:CharacterString'][0]);
    assert.equal('lictext3',           otherNode[2]['gco:CharacterString'][0]);

    done();
});

it('#9 M2I point of concats', function(done) {

    var mapx = create_sample_mapx();
    MAPX.add_contact(mapx, "metadata f1", "name1", "addr1", "mail@mail1");
    MAPX.add_contact(mapx, "metadata f2", "name2", "addr2", "mail@mail2");

    assert.equal(5, MAPX.get_contacts(mapx).length);
    var iso_json = create_nomalized_iso_json(mapx);

    var md_contacts = iso_json[MD_ROOT_NAME]['gmd:contact'];
    assert.equal(2, md_contacts.length);

    var identNode = iso_json[MD_ROOT_NAME]['gmd:identificationInfo'][0][DATA_IDENT_NAME][0];
    var data_poc = identNode["gmd:pointOfContact"];
    assert.equal(3, data_poc.length);

    done();
});


it('#1 I2M dates' , function(done) {

    var mapx = load_xml(__dirname + "/data/no_pubdate_yes_revision.xml");

    assert.equal(MAPX.get_release_date(mapx), DATE_DEFAULT);
    assert.equal(MAPX.get_modified_date(mapx), '2015-07-14');

    mapx = load_xml(__dirname + "/data/no_pubdate_no_revision.xml");

    assert.equal(MAPX.get_release_date(mapx), '2020-01-01');
    assert.equal(MAPX.get_modified_date(mapx), DATE_DEFAULT);

    done();
});

it('#2 I2M comma separated contacts' , function(done) {

    var mapx = load_xml(__dirname + "/data/contacts_01.xml");

    var cont = MAPX.get_contacts(mapx)[0];

    assert.equal(cont.name, 'CTO');

    done();
});

it('#3 I2M role codes' , function(done) {

    var mapx = load_xml(__dirname + "/data/contacts_01.xml");

    var cont = MAPX.get_contacts(mapx)[0];

    assert.equal(cont.function, 'Metadata  Point of Contact');

    done();
});

it('#4 I2M Org as address' , function(done) {

    var mapx = load_xml(__dirname + "/data/contacts_01.xml");

    var cont = MAPX.get_contacts(mapx)[1];

    assert.ok(! cont.name.includes('Bren School'));
    assert.ok(cont.address.startsWith('Bren School'));

    done();
});


function get_date_from_iso(iso_xml) {

    const MD_ROOT_NAME = 'gmd:MD_Metadata';
    const DATA_IDENT_NAME = 'gmd:MD_DataIdentification';
    const CI_CITATION = "gmd:CI_Citation";

    var ret = {};

    xml2js.parseString(iso_xml, function (err, iso_json) {

        var mdRoot = iso_json[MD_ROOT_NAME];
        var identificationInfo = mdRoot['gmd:identificationInfo'][0];
        var identNode = identificationInfo[DATA_IDENT_NAME][0];
        // console.log("identNodeificationInfo[0] ", identNode);
        var dataCitationNode = getFirstFromPath(identNode, ["gmd:citation", CI_CITATION]);
        // console.log("citation ", dataCitationNode);
        for( var date of dataCitationNode["gmd:date"] || []) {
            // console.log("date loop ", date);
            var typeNode = getFirstFromPath(date, [ "gmd:CI_Date", "gmd:dateType", "gmd:CI_DateTypeCode"]);
            var typeValue = typeNode["$"]["codeListValue"];

            var dateTimeVal = getFirstFromPath(date, [ "gmd:CI_Date", "gmd:date", "gco:DateTime"]);
            var dateVal = getFirstFromPath(date, [ "gmd:CI_Date", "gmd:date", "gco:Date"]);

            ret[typeValue] = dateVal ? dateVal : dateTimeVal;
        }
    });

    return ret;
}


function create_nomalized_iso_json(mapx) {
    var iso = M2I.mapx_to_iso19139(mapx);
    var xml = builder.create(iso, { encoding: 'utf-8' });
    var xmlFormatted = xml.end({ pretty: true });

    var result;
//    var prc = {tagNameProcessors: [xml2js.processors.stripPrefix]};
    new xml2js.Parser().parseString(xmlFormatted, (e, r) => { result = r });
    return result;
}

function get_time_extent_from_iso(iso_xml) {

    const MD_ROOT_NAME = 'gmd:MD_Metadata';
    const DATA_IDENT_NAME = 'gmd:MD_DataIdentification';
    const CI_CITATION = "gmd:CI_Citation";

    var ret = {};

    xml2js.parseString(iso_xml, function (err, iso_json) {

        var mdRoot = iso_json[MD_ROOT_NAME];
        var identificationInfo = mdRoot['gmd:identificationInfo'][0];
        var identNode = identificationInfo[DATA_IDENT_NAME][0];

        var timePeriod = findFirstFromPath(identNode, [ "gmd:extent", "gmd:EX_Extent", "gmd:temporalElement", "gmd:EX_TemporalExtent", "gmd:extent", "gml:TimePeriod"]);

        if(timePeriod) {
            var optStart = timePeriod["gml:beginPosition"];
            var optEnd = timePeriod["gml:endPosition"];

            if(optStart)
                ret['start'] = optStart;

            if(optEnd)
                ret['end'] = optEnd;
        }
    });

    return ret;
}


function create_sample_mapx() {

    var mapx = MAPX.create_object();

    MAPX.add_contact(mapx, "func1", "name1", "addr1", "mail@mail1");
    MAPX.add_contact(mapx, "func2", "name2", "addr2", "mail@mail2");
    MAPX.add_contact(mapx, "func3", "name3", "addr3", "mail@mail3");

    MAPX.add_keyword(mapx, "kw1");
    MAPX.add_keyword(mapx, "kw2");

    MAPX.add_language(mapx, "en");

    MAPX.add_license(mapx, "licname1", "lictext1");
    MAPX.add_license(mapx, "licname2", "lictext2");
    MAPX.add_license(mapx, "", "lictext3");

    MAPX.set_notes(mapx, "en", "note1", "textnote1");

    MAPX.add_reference(mapx, "ref1");
    MAPX.add_reference(mapx, "ref2");
    MAPX.add_reference(mapx, "ref3");

    MAPX.add_source(mapx, "http://source1", true);
    MAPX.add_source(mapx, "http://source2", false);

    MAPX.set_abstract(mapx, "en", "very abstract");
    MAPX.set_bbox(mapx,-10,10,-20,20);
    MAPX.set_crs(mapx, "EPSG:4326", "http://epsg/4326");
    MAPX.set_homepage(mapx, "http://homepage");
    MAPX.set_modified_date(mapx, "2019-05-01");
    MAPX.set_periodicity(mapx, "daily");
    MAPX.set_release_date(mapx, "2019-01-01");
    MAPX.set_title(mapx, "en", "title");

    return mapx;
}



function load_xml(source) {
    // const fs = require("fs");

    var xml = fs.readFileSync(source);
    var mapx = null;
    xml2js.parseString(
        xml,
        {
            tagNameProcessors: [xml2js.processors.stripPrefix]
        },
        function (error, json) {
            if (error === null) {
                mapx = I2M.iso19139_to_mapx(json, null);

            } else {
                console.error(error);
                console.log(xml);
                return;
            }
        }
    );

    return mapx;
}
