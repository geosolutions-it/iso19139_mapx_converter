/* 
 */

var expect  = require('chai').expect;
const assert = require('assert');

const xml2js = require('xml2js');
const builder = require('xmlbuilder');

const getFirstFromPath = require("../convert_iso_to_mapx").getFirstFromPath;
const findFirstFromPath = require("../convert_iso_to_mapx").findFirstFromPath;
const MAPX = require("../mapx");


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
    
    const m2i = require("../convert_mapx_to_iso");
    var iso = m2i.mapx_to_iso19139(mapx);
    
    const builder = require('xmlbuilder');
    var xml = builder.create(iso, { encoding: 'utf-8' })
    var xmlFormatted = xml.end({ pretty: true });
    // console.log("METADATA as XML", xmlFormatted);    
    done();
});
    

it('Check M2I dates', function(done) {

    const getFirstFromPath = require("../convert_iso_to_mapx").getFirstFromPath;

    var mapx = create_sample_mapx();
    
    const m2i = require("../convert_mapx_to_iso");
    var iso = m2i.mapx_to_iso19139(mapx);
    var xml = builder.create(iso, { encoding: 'utf-8' })
    var xmlFormatted = xml.end({ pretty: true });
    
    dates = get_date_from_iso(xmlFormatted);
    
    assert.equal(dates['publication'],"2019-01-01");
    assert.equal(dates['revision'],"2019-05-01");

    done();    
});


it('Check void M2I dates', function(done) {
    const getFirstFromPath = require("../convert_iso_to_mapx").getFirstFromPath;

    var mapx = MAPX.create_object();
    
    const m2i = require("../convert_mapx_to_iso");
    var iso = m2i.mapx_to_iso19139(mapx);
    var xml = builder.create(iso, { encoding: 'utf-8' })
    var xmlFormatted = xml.end({ pretty: true });
    
    dates = get_date_from_iso(xmlFormatted);
    
    assert.equal(Object.keys(dates).length, 0);

    done();    
});


it('Check equals M2I dates', function(done) {
    const getFirstFromPath = require("../convert_iso_to_mapx").getFirstFromPath;

    var mapx = MAPX.create_object();
    
    MAPX.set_modified_date(mapx, "2019-09-25");
    MAPX.set_release_date(mapx, "2019-09-25");
        
    const m2i = require("../convert_mapx_to_iso");
    var iso = m2i.mapx_to_iso19139(mapx);
    var xml = builder.create(iso, { encoding: 'utf-8' })
    var xmlFormatted = xml.end({ pretty: true });
    
    dates = get_date_from_iso(xmlFormatted);
    
    assert.equal(Object.keys(dates).length, 1);
    assert.equal(dates['publication'],"2019-09-25");    

    done();    
});


it('Check begin time extent', function(done) {

    const getFirstFromPath = require("../convert_iso_to_mapx").getFirstFromPath;

    var mapx = create_sample_mapx();
    MAPX.set_temporal_start(mapx, "2019-09-26")
    
    const m2i = require("../convert_mapx_to_iso");
    var iso = m2i.mapx_to_iso19139(mapx);
    var xml = builder.create(iso, { encoding: 'utf-8' })
    var xmlFormatted = xml.end({ pretty: true });
//    console.log("ISO ", xmlFormatted);
    
    dates = get_time_extent_from_iso(xmlFormatted);
    
    assert.equal(Object.keys(dates).length, 1);
    assert.equal(dates['start'],"2019-09-26");

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
                ret['start'] = optStart

            if(optEnd) 
                ret['end'] = optEnd
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
    MAPX.add_license(mapx, "licname3", "lictext3");
    
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

