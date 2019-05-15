// Model for an object containing MAPX information.
// 
// Author: Emanuele Tajariol (GeoSolutions) <etj@geo-solutions.it>

const LANGUAGES = ['en', 'fr', 'es', 'ru', 'zh', 'de', 'bn', 'fa', 'ps']
const PERIODICITY = ["continual", "daily", "weekly", "fortnightly", "monthly", "quarterly", "biannually",
    "annually", "as_needed", "irregular", "not_planned", "unknown"]

module.exports = {
    
    LANGUAGES : LANGUAGES,
    PERIODICITY : PERIODICITY,

    create_object: function () {

        mapx = {}

        text = {}
        mapx['text'] = text;

        for (const name of ['title', 'abstract', 'notes']) {
            initLanguages(text, name)
        }

        text['keywords'] = {'keys': []}
        text['attributes'] = {}
        text['attributes_alias'] = {}
        text['language'] = {'codes': []}

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
        }

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
        }

        mapx['contact'] = {'contacts': []}

        mapx['origin'] = {
            'homepage': {'url': undefined},
            'source': {'urls': []}
        }

        mapx['license'] = {
            'allowDownload': true,
            'licenses': []
        }

        mapx['annex'] = {'references': []}

        integrity = {}
        mapx['integrity'] = integrity
        for (var i1 = 1; i1 < 5; i1++) {
            for (var i2 = 1; i2 < 5; i2++) {
                integrity['di_' + i1 + "_" + i2] = "0"
            }
        }

        return mapx
    },

    set_title: function (mapx, lang, value) {
        checkLang(lang)
        mapx['text']['title'][lang] = value
    },
    get_title: function (mapx, lang) {
        return mapx['text']['title'][lang];
    },
    get_all_titles: function (mapx) {
        return mapx['text']['title'];
    },
        
    set_abstract: function (mapx, lang, value) {
        checkLang(lang)
        mapx['text']['abstract'][lang] = value
    },
    get_abstract: function (mapx, lang) {
        return mapx['text']['abstract'][lang];
    },
    get_all_abstracts: function (mapx) {
        return mapx['text']['abstract'];
    },
    
    set_notes: function (mapx, lang, value) {
        checkLang(lang)
        mapx['text']['notes'][lang] = value
    },
    get_notes: function (mapx, lang) {
        return mapx['text']['notes'][lang];
    },
    get_all_notes: function (mapx) {
        return mapx['text']['notes'];
    },    
    add_note: function (mapx, lang, title, value) {
        if(value) {
            checkLang(lang);
            var old = mapx['text']['notes'][lang];
            var sep = old.length === 0 ? "" : "\n\n";
            mapx['text']['notes'][lang] = old + sep + title + ": " + value;
        }
    },

    add_keyword: function (mapx, keyword) {
        mapx['text']['keywords']['keys'].push(keyword)
    },
    get_keywords: function (mapx) {
        return mapx['text']['keywords']['keys'];
    },

    add_language: function (mapx, langcode) {
        checkLang(langcode)
        mapx['text']['language']['codes'].push({'code': langcode})
    },
    get_languages: function (mapx) {
        var ret = [];
        for (var code of mapx['text']['language']['codes']) 
            ret.push(code["code"]);
        return ret;
    },

    set_attribute: function (mapx, lang, attname, value) {
        // check: if not exists, init all langs
        // then set the value
    },

    set_release_date: function (mapx, date) {
        checkDate(date)
        mapx['temporal']['issuance']['released_at'] = date
    },
    get_release_date: function (mapx) {
        return mapx['temporal']['issuance']['released_at'];
    },

    set_modified_date: function (mapx, date) {
        checkDate(date)
        mapx['temporal']['issuance']['modified_at'] = date
    },
    get_modified_date: function (mapx) {
        return mapx['temporal']['issuance']['modified_at'];
    },

    set_periodicity: function (mapx, periodicity) {
        if (!PERIODICITY.includes(periodicity))
            throw new Error("Unknown periodicity: " + periodicity)

        mapx['temporal']['issuance']['periodicity'] = periodicity
    },
    get_periodicity: function (mapx) {
        return mapx['temporal']['issuance']['periodicity']
    },

    set_temporal_start: function (mapx, date) {
        checkDate(date)
        mapx['temporal']['range']['start_at'] = date
        mapx['temporal']['range']['is_timeless'] = false
    },
    set_temporal_end: function (mapx, date) {
        checkDate(date)
        mapx['temporal']['range']['end_at'] = date
        mapx['temporal']['range']['is_timeless'] = false
    },
    is_timeless: function (mapx) {
        return mapx['temporal']['range']['is_timeless'];
    },
    get_temporal_start: function (mapx) {
        return mapx['temporal']['range']['start_at'];
    },
    get_temporal_end: function (mapx) {
        return mapx['temporal']['range']['end_at'];
    },

    set_crs: function (mapx, code, url) {
        mapx['spatial']['crs']['code'] = code
        mapx['spatial']['crs']['url'] = url
    },
    get_crs_code: function (mapx) {
        return mapx['spatial']['crs']['code'];
    },

    set_bbox: function (mapx, lng_min, lng_max, lat_min, lat_max) {
        mapx['spatial']['bbox']['lng_min'] = lng_min
        mapx['spatial']['bbox']['lng_max'] = lng_max
        mapx['spatial']['bbox']['lat_min'] = lat_min
        mapx['spatial']['bbox']['lat_max'] = lat_max
    },
    get_bbox: function (mapx) {
        return [
            mapx['spatial']['bbox']['lng_min'],
            mapx['spatial']['bbox']['lng_max'],
            mapx['spatial']['bbox']['lat_min'],
            mapx['spatial']['bbox']['lat_max']]
    },
    
    add_contact: function (mapx, func, name, addr, mail) {

        mapx['contact']['contacts'].push({
            "function": func,
            "name": name,
            "address": addr,
            "email": mail
        })
    },
    get_contacts: function (mapx) {
        return (mapx['contact']||[])['contacts'];
    },

    set_homepage: function (mapx, url) {
        mapx['origin']['homepage']['url'] = url
    },

    add_source: function (mapx, url, is_download_link) {
        mapx['origin']['source']['urls'].push({
            'is_download_link': is_download_link,
            'url': url
        })
    },
    get_sources: function (mapx) {
        return mapx['origin']['source']['urls'];
    },

    set_license_download: function (mapx, allow) {
        mapx['license']['allowDownload'] = allow ? true : false;
    },

    add_license: function (mapx, name, text) {
        mapx['license']['licenses'].push({
            'name': name,
            'text': text
        })
    },
    get_licenses: function (mapx) {
        return mapx['license']['licenses'];
    },

    add_reference: function (mapx, url) {
        mapx['annex']['references'].push({'url': url})
    },

    set_integrity: function (mapx, i1, i2, value) {
        mapx['integrity']['di_' + i1 + "_" + i2] = value
    }

};

function initLanguages(map, name) {
    i18nmap = {}
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

