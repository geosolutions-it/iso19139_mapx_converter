// Model for an object containing MAPX information.
//
// Author: Emanuele Tajariol (GeoSolutions) <etj@geo-solutions.it>

export const LANGUAGES = ['en', 'fr', 'es', 'ru', 'zh', 'de', 'bn', 'fa', 'ps'];
export const PERIODICITY = ["continual", "daily", "weekly", "fortnightly", "monthly", "quarterly", "biannually",
    "annually", "as_needed", "irregular", "not_planned", "unknown"];

export function create_object() {

        var mapx = {};

        var text = {};
        mapx['text'] = text;

        for (const name of ['title', 'abstract', 'notes']) {
            initLanguages(text, name);
        }

        text['keywords'] = {'keys': []};
        text['attributes'] = {};
        text['attributes_alias'] = {};
        text['language'] = {'codes': []};

        mapx['temporal'] = {
            'issuance': {
                'periodicity': 'unknown',
                'released_at': '0001-01-01',
                'modified_at': '0001-01-01'
            },
            'range': {
                'is_timeless': true,
                'start_at': '0001-01-01',
                'end_at': '0001-01-01'
            }
        };

        mapx['spatial'] = {
            'crs': {
                'code': 'EPSG:4326',
                'url': 'http://spatialreference.org/ref/epsg/4326/',
            },
            'bbox': {
                "lng_min": -180,
                "lng_max": 190,
                "lat_min": -90,
                "lat_max": 90
            }
        };

        mapx['contact'] = {'contacts': []};

        mapx['origin'] = {
            'homepage': {'url': undefined},
            'source': {'urls': []}
        };

        mapx['license'] = {
            'allowDownload': true,
            'licenses': []
        };

        mapx['annex'] = {'references': []};

        return mapx;
}

export function set_title(mapx, lang, value) {
    checkLang(lang);
    mapx['text']['title'][lang] = value;
}
export function  get_title(mapx, lang) {
    return mapx['text']['title'][lang];
}
export function  get_all_titles(mapx) {
    return mapx['text']['title'];
}

export function set_abstract(mapx, lang, value) {
    checkLang(lang);
    mapx['text']['abstract'][lang] = value;
}
export function get_abstract(mapx, lang) {
    return mapx['text']['abstract'][lang];
}
export function get_all_abstracts(mapx) {
    return mapx['text']['abstract'];
}

export function set_notes(mapx, lang, value) {
    checkLang(lang);
    mapx['text']['notes'][lang] = value;
}
export function get_notes(mapx, lang) {
    return mapx['text']['notes'][lang];
}
export function get_all_notes(mapx) {
    return mapx['text']['notes'];
}
export function add_note(mapx, lang, title, value) {
    if(value) {
        checkLang(lang);
        var old = mapx['text']['notes'][lang];
        var sep = old.length === 0 ? "" : "\n\n";
        mapx['text']['notes'][lang] = old + sep + title + ": " + value;
    }
}

export function add_keyword(mapx, keyword) {
    mapx['text']['keywords']['keys'].push(keyword);
}
export function get_keywords(mapx) {
    return mapx['text']['keywords']['keys'];
}

export function add_language(mapx, langcode) {
    checkLang(langcode);
    mapx['text']['language']['codes'].push({'code': langcode});
}
export function get_languages(mapx) {
    var ret = [];
    for (var code of mapx['text']['language']['codes'])
        ret.push(code["code"]);
    return ret;
}

export function set_attribute(mapx, lang, attname, value) {
    // check: if not exists, init all langs
    // then set the value
}

export function set_release_date(mapx, date) {
    checkDate(date);
    mapx['temporal']['issuance']['released_at'] = date;
}
export function get_release_date(mapx) {
    return mapx['temporal']['issuance']['released_at'];
}
export function exist_release_date(mapx) {
    return mapx['temporal']['issuance']['released_at'] != '0001-01-01';
}

export function set_modified_date(mapx, date) {
    checkDate(date);
    mapx['temporal']['issuance']['modified_at'] = date
}
export function get_modified_date(mapx) {
    return mapx['temporal']['issuance']['modified_at'];
}
export function exist_modified_date(mapx) {
    return mapx['temporal']['issuance']['modified_at'] != '0001-01-01';
}

export function set_periodicity(mapx, periodicity) {
    if (!PERIODICITY.includes(periodicity))
        throw new Error("Unknown periodicity: " + periodicity);
    
    mapx['temporal']['issuance']['periodicity'] = periodicity;
}
export function get_periodicity(mapx) {
    return mapx['temporal']['issuance']['periodicity'];
}

export function set_temporal_start(mapx, date) {
    checkDate(date)
    mapx['temporal']['range']['start_at'] = date;
    mapx['temporal']['range']['is_timeless'] = false;
}
export function set_temporal_end(mapx, date) {
    checkDate(date);
    mapx['temporal']['range']['end_at'] = date;
    mapx['temporal']['range']['is_timeless'] = false;
}
export function is_timeless(mapx) {
    return mapx['temporal']['range']['is_timeless'];
}
export function get_temporal_start(mapx) {
    return mapx['temporal']['range']['start_at'];
}
export function get_temporal_end(mapx) {
    return mapx['temporal']['range']['end_at'];
}
export function exist_temporal_start(mapx) {
    return mapx['temporal']['range']['start_at'] != '0001-01-01';
}
export function exist_temporal_end(mapx) {
    return mapx['temporal']['range']['end_at'] != '0001-01-01';
}

export function set_crs(mapx, code, url) {
    mapx['spatial']['crs']['code'] = code;
    mapx['spatial']['crs']['url'] = url;
}
export function get_crs_code(mapx) {
    return mapx['spatial']['crs']['code'];
}

export function set_bbox(mapx, lng_min, lng_max, lat_min, lat_max) {
    mapx['spatial']['bbox']['lng_min'] = lng_min;
    mapx['spatial']['bbox']['lng_max'] = lng_max;
    mapx['spatial']['bbox']['lat_min'] = lat_min;
    mapx['spatial']['bbox']['lat_max'] = lat_max;
}
export function get_bbox(mapx) {
    return [
        mapx['spatial']['bbox']['lng_min'],
        mapx['spatial']['bbox']['lng_max'],
        mapx['spatial']['bbox']['lat_min'],
        mapx['spatial']['bbox']['lat_max']]
}

export function add_contact(mapx, func, name, addr, mail) {
    mapx['contact']['contacts'].push({
        "function": func,
        "name": name,
        "address": addr,
        "email": mail
    })
}
export function get_contacts(mapx) {
    return (mapx['contact']||[])['contacts'];
}

export function set_homepage(mapx, url) {
    mapx['origin']['homepage']['url'] = url;
}
export function get_homepage(mapx) {
    return mapx['origin']['homepage']['url'];
}

export function add_source(mapx, url, is_download_link) {
    mapx['origin']['source']['urls'].push({
        'is_download_link': is_download_link,
        'url': url
    })
}
export function get_sources(mapx) {
    return mapx['origin']['source']['urls'];
}

export function set_license_download(mapx, allow) {
    mapx['license']['allowDownload'] = allow ? true : false;
}

export function add_license(mapx, name, text) {
    mapx['license']['licenses'].push({
        'name': name,
        'text': text
    })
}
export function get_licenses(mapx) {
    return mapx['license']['licenses'];
}

export function add_reference(mapx, url) {
        mapx['annex']['references'].push({'url': url})
}
export function get_references(mapx) {
    var ret = [];
    for (var u of mapx['annex']['references']) {
        ret.push(u['url']);
    }
    return ret;
}



function initLanguages(map, name) {
    var i18nmap = {}
    map[name] = i18nmap

    for (const lang of LANGUAGES) {
        i18nmap[lang] = ""
    }
}

function checkLang(langCode) {
    if (!LANGUAGES.includes(langCode))
        throw new Error("Unknown language " + langCode)
}

function checkDate(date) {
    // TODO
}

