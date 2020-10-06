// Model for an object containing MAPX information.
//
// Author: Emanuele Tajariol (GeoSolutions) <etj@geo-solutions.it>

export const LANGUAGES = ['en', 'fr', 'es', 'ru', 'zh', 'de', 'bn', 'fa', 'ps']
export const PERIODICITY = ['continual', 'daily', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'biannually',
    'annually', 'as_needed', 'irregular', 'not_planned', 'unknown'
]
export const TOPICS = [
    "biota",
    "boundaries",
    "farming",
    "climatologyMeteorologyAtmosphere",
    "economy",
    "elevation",
    "environment",
    "geoscientificInformation",
    "health",
    "imageryBaseMapsEarthCover",
    "intelligenceMilitary",
    "inlandWaters",
    "location",
    "oceans",
    "planningCadastre",
    "society",
    "structure",
    "transportation",
    "utilitiesCommunication"
]

export function createObject() {
    var mapx = {}

    var text = {}
    mapx.text = text

    for (const name of ['title', 'abstract', 'notes']) {
        initLanguages(text, name)
    }

    text.keywords = {
        keys: [],
        topics: []
    }
    text.attributes = {}
    text.attributes_alias = {}
    text.language = {
        codes: []
    }

    mapx.temporal = {
        issuance: {
            periodicity: 'unknown',
            released_at: '0001-01-01',
            modified_at: '0001-01-01'
        },
        range: {
            is_timeless: true,
            start_at: '0001-01-01',
            end_at: '0001-01-01'
        }
    }

    mapx.spatial = {
        crs: {
            code: 'EPSG:4326',
            url: 'http://spatialreference.org/ref/epsg/4326/'
        },
        bbox: {
            lng_min: -180,
            lng_max: 190,
            lat_min: -90,
            lat_max: 90
        }
    }

    mapx.contact = {
        contacts: []
    }

    mapx.origin = {
        homepage: {
            url: undefined
        },
        source: {
            urls: []
        }
    }

    mapx.license = {
        allowDownload: true,
        licenses: []
    }

    mapx.annex = {
        references: []
    }

    return mapx
}

export function setTitle(mapx, lang, value) {
    checkLang(lang)
    mapx.text.title[lang] = value
}
export function getTitle(mapx, lang) {
    return mapx.text.title[lang]
}
export function getAllTitles(mapx) {
    return mapx.text.title
}

export function setAbstract(mapx, lang, value) {
    checkLang(lang)
    mapx.text.abstract[lang] = value
}
export function getAbstract(mapx, lang) {
    return mapx.text.abstract[lang]
}
export function getAllAbstracts(mapx) {
    return mapx.text.abstract
}

export function setNotes(mapx, lang, value) {
    checkLang(lang)
    mapx.text.notes[lang] = value
}
export function getNotes(mapx, lang) {
    return mapx.text.notes[lang]
}
export function getAllNotes(mapx) {
    return mapx.text.notes
}
export function addNote(mapx, lang, title, value) {
    if (value) {
        checkLang(lang)
        var old = mapx.text.notes[lang]
        var sep = old.length === 0 ? '' : '. '
        mapx.text.notes[lang] = `${old}${sep}${title}: ${value}`
    }
}

export function addKeyword(mapx, keyword) {
    mapx.text.keywords.keys.push(keyword)
}
export function getKeywords(mapx) {
    return mapx.text.keywords.keys
}

export function addTopic(mapx, topic) {
    // check topic is correct
    if (!TOPICS.includes(topic)) {
        throw new Error(`Unknown topic: [${topic}]`)
    }

    // add topic
    mapx.text.keywords.topics.push(topic)
}
export function getTopics(mapx) {
    return mapx.text.keywords.topics
}

export function addLanguage(mapx, langcode) {
    checkLang(langcode)
    mapx.text.language.codes.push({
        code: langcode
    })
}
export function getLanguages(mapx) {
    var ret = []
    for (var code of mapx.text.language.codes) {
        ret.push(code.code)
    }
    return ret
}

export function setAttribute(mapx, lang, attname, value) {
    var attr = mapx.text.attributes[attname] || initLanguages(mapx.text.attributes, attname)
    attr.lang = value
}
export function getAttributeVal(mapx, lang, attname) {
    var attr = mapx.text.attributes[attname]
    return attr ? attr[lang] : undefined
}
export function getFirstAttributeVal(mapx, attname) {
    var attr = mapx.text.attributes[attname]
    if (attr) {
        for (const lang of LANGUAGES) {
            if (attr[lang]) {
                return attr[lang]
            }
        }
    }
    return undefined
}
export function getAllAttributes(mapx) {
    return mapx.text.attributes
}
export function getAttributeNames(mapx) {
    return Object.getOwnPropertyNames(mapx.text.attributes)
}

export function setReleaseDate(mapx, date) {
    checkDate(date)
    mapx.temporal.issuance.released_at = date
}
export function getReleaseDate(mapx) {
    return mapx.temporal.issuance.released_at
}
export function existReleaseDate(mapx) {
    return mapx.temporal.issuance.released_at !== '0001-01-01'
}

export function setModifiedDate(mapx, date) {
    checkDate(date)
    mapx.temporal.issuance.modified_at = date
}
export function getModifiedDate(mapx) {
    return mapx.temporal.issuance.modified_at
}
export function existModifiedDate(mapx) {
    return mapx.temporal.issuance.modified_at !== '0001-01-01'
}

export function setPeriodicity(mapx, periodicity) {
    if (!PERIODICITY.includes(periodicity)) {
        throw new Error(`Unknown periodicity: ${periodicity}`)
    }

    mapx.temporal.issuance.periodicity = periodicity
}
export function getPeriodicity(mapx) {
    return mapx.temporal.issuance.periodicity
}

export function setTemporalStart(mapx, date) {
    checkDate(date)
    mapx.temporal.range.start_at = date
    mapx.temporal.range.is_timeless = false
}
export function setTemporalEnd(mapx, date) {
    checkDate(date)
    mapx.temporal.range.end_at = date
    mapx.temporal.range.is_timeless = false
}
export function isTimeless(mapx) {
    return mapx.temporal.range.is_timeless
}
export function getTemporalStart(mapx) {
    return mapx.temporal.range.start_at
}
export function getTemporalEnd(mapx) {
    return mapx.temporal.range.end_at
}
export function existTemporalStart(mapx) {
    return mapx.temporal.range.start_at !== '0001-01-01'
}
export function existTemporalEnd(mapx) {
    return mapx.temporal.range.end_at !== '0001-01-01'
}

export function setCrs(mapx, code, url) {
    mapx.spatial.crs.code = code
    mapx.spatial.crs.url = url
}
export function getCrsCode(mapx) {
    return mapx.spatial.crs.code
}

export function setBBox(mapx, lngMin, lngMax, latMin, latMax) {
    mapx.spatial.bbox.lng_min = lngMin
    mapx.spatial.bbox.lng_max = lngMax
    mapx.spatial.bbox.lat_min = latMin
    mapx.spatial.bbox.lat_max = latMax
}
export function getBBox(mapx) {
    return [
        mapx.spatial.bbox.lng_min,
        mapx.spatial.bbox.lng_max,
        mapx.spatial.bbox.lat_min,
        mapx.spatial.bbox.lat_max
    ]
}

export function addContact(mapx, func, name, addr, mail) {
    mapx.contact.contacts.push({
        function: func,
        name: name,
        address: addr,
        email: mail
    })
}
export function getContacts(mapx) {
    return (mapx.contact || []).contacts
}

export function setHomepage(mapx, url) {
    mapx.origin.homepage.url = url
}
export function getHomepage(mapx) {
    return mapx.origin.homepage.url
}

export function addSource(mapx, url, isDownloadLink) {
    mapx.origin.source.urls.push({
        is_download_link: isDownloadLink,
        url: url
    })
}
export function getSources(mapx) {
    return mapx.origin.source.urls
}

export function setLicenseDownload(mapx, allow) {
    mapx.license.allowDownload = !!allow
}

export function addLicense(mapx, name, text) {
    mapx.license.licenses.push({
        name: name,
        text: text
    })
}
export function getLicenses(mapx) {
    return mapx.license.licenses
}

export function addReference(mapx, url) {
    mapx.annex.references.push({
        url: url
    })
}
export function getReferences(mapx) {
    var ret = []
    for (var u of mapx.annex.references) {
        ret.push(u.url)
    }
    return ret
}

function initLanguages(map, name) {
    var i18nmap = {}
    map[name] = i18nmap

    for (const lang of LANGUAGES) {
        i18nmap[lang] = ''
    }

    return i18nmap
}

function checkLang(langCode) {
    if (!LANGUAGES.includes(langCode)) {
        throw new Error(`Unknown language ${langCode}`)
    }
}

export function checkDate(date) {
    if (date && date.length === 4) {
        return false
    }
    var timestamp = Date.parse(date)
    return !isNaN(timestamp)
}