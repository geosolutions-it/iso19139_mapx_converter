/* 
 */

const MAPX = require("./mapx");
const assert = require("assert");

test_parse();
test_m2i();


function test_parse() {

    var mapx = create_sample_mapx();
    var json = JSON.stringify(mapx, null, 3);
    var pars = JSON.parse(json);


    assert.equal(MAPX.get_title(mapx,"en"), "title", "M title mismatch");
    assert.equal(MAPX.get_title(pars,"en"), "title", "P title mismatch");

    assert.equal(MAPX.get_contacts(mapx)[0]["function"], "func1", "M func1 mismatch " + JSON.stringify(MAPX.get_contacts(mapx)[0]));
    assert.equal(MAPX.get_contacts(pars)[0]["function"], "func1", "P func1 mismatch " + JSON.stringify(MAPX.get_contacts(pars)[0]));

    assert.equal(MAPX.get_contacts(mapx)[1]["function"], "func2", "M func1 mismatch " + JSON.stringify(MAPX.get_contacts(mapx)[1]));
    assert.equal(MAPX.get_contacts(pars)[1]["function"], "func2", "P func1 mismatch " + JSON.stringify(MAPX.get_contacts(pars)[1]));
}

function test_m2i() {

    var mapx = create_sample_mapx();
    
    const m2i = require("./convert_mapx_to_iso");
    var iso = m2i.mapx_to_iso19139(mapx);
    
    const builder = require('xmlbuilder');
    var xml = builder.create(iso, { encoding: 'utf-8' })
    var xmlFormatted = xml.end({ pretty: true });
//    console.log("METADATA as XML", xmlFormatted);    
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

