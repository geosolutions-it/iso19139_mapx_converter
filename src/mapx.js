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



export class MapX {

    constructor(obj) {
        this.mapx = obj || createObject()
    }

    setTitle(lang, value) {
        if (!checkLang(lang)) {
            return false
        }
        this.mapx.text.title[lang] = value
        return true
    }
    getTitle(lang) {
        return this.mapx.text.title[lang]
    }
    getAllTitles() {
        return this.mapx.text.title
    }

    setAbstract(lang, value) {
        if (!checkLang(lang)) {
            return false
        }
        this.mapx.text.abstract[lang] = value
        return true
    }
    getAbstract(lang) {
        return this.mapx.text.abstract[lang]
    }
    getAllAbstracts() {
        return this.mapx.text.abstract
    }

    setNotes(lang, value) {
        if (!checkLang(lang)) {
            return false
        }
        this.mapx.text.notes[lang] = value
        return true
    }
    getNotes(lang) {
        return this.mapx.text.notes[lang]
    }
    getAllNotes() {
        return this.mapx.text.notes
    }
    addNote(lang, title, value) {
        if (!checkLang(lang)) {
            return false
        }

        if (value) {
            var old = this.mapx.text.notes[lang]
            var sep = old.length === 0 ? '' : '. '
            this.mapx.text.notes[lang] = `${old}${sep}${title}: ${value}`
        }
        return true
    }

    addKeyword(keyword) {
        this.mapx.text.keywords.keys.push(keyword)
    }
    getKeywords() {
        return this.mapx.text.keywords.keys
    }

    addTopic(topic) {
        if (!TOPICS.includes(topic)) {
            return false
        }
        this.mapx.text.keywords.topics.push(topic)
        return true
    }
    getTopics(mapx) {
        return this.mapx.text.keywords.topics
    }

    addLanguage(lang) {
        if (!checkLang(lang)) {
            return false
        }

        this.mapx.text.language.codes.push({
            code: lang
        })
        return false
    }
    getLanguages() {
        var ret = []
        for (var code of this.mapx.text.language.codes) {
            ret.push(code.code)
        }
        return ret
    }

    setAttribute(lang, attname, value) {
        var attr = this.mapx.text.attributes[attname] || initLanguages(this.mapx.text.attributes, attname)
        attr.lang = value
    }
    getAttributeVal(lang, attname) {
        var attr = this.mapx.text.attributes[attname]
        return attr ? attr[lang] : undefined
    }
    getFirstAttributeVal(attname) {
        var attr = this.mapx.text.attributes[attname]
        if (attr) {
            for (const lang of LANGUAGES) {
                if (attr[lang]) {
                    return attr[lang]
                }
            }
        }
        return undefined
    }
    getAllAttributes() {
        return this.mapx.text.attributes
    }
    getAttributeNames() {
        return Object.getOwnPropertyNames(this.mapx.text.attributes)
    }

    setReleaseDate(date) {
        if (!checkDate(date)) {
            return false
        }
        this.mapx.temporal.issuance.released_at = date
        return true
    }
    getReleaseDate() {
        return this.mapx.temporal.issuance.released_at
    }
    existReleaseDate(mapx) {
        return this.mapx.temporal.issuance.released_at !== '0001-01-01'
    }

    setModifiedDate(date) {
        if (!checkDate(date)) {
            return false
        }
        this.mapx.temporal.issuance.modified_at = date
        return true
    }
    getModifiedDate() {
        return this.mapx.temporal.issuance.modified_at
    }
    existModifiedDate() {
        return this.mapx.temporal.issuance.modified_at !== '0001-01-01'
    }

    setPeriodicity(periodicity) {
        if (!PERIODICITY.includes(periodicity)) {
            return false
        }

        this.mapx.temporal.issuance.periodicity = periodicity
        return true
    }
    getPeriodicity() {
        return this.mapx.temporal.issuance.periodicity
    }

    setTemporalStart(date) {
        if (!checkDate(date)) {
            return false
        }
        this.mapx.temporal.range.start_at = date
        this.mapx.temporal.range.is_timeless = false
        return true
    }
    setTemporalEnd(date) {
        if (!checkDate(date)) {
            return false
        }
        this.mapx.temporal.range.end_at = date
        this.mapx.temporal.range.is_timeless = false
        return true
    }
    isTimeless() {
        return this.mapx.temporal.range.is_timeless
    }
    getTemporalStart() {
        return this.mapx.temporal.range.start_at
    }
    getTemporalEnd() {
        return this.mapx.temporal.range.end_at
    }
    existTemporalStart() {
        return this.mapx.temporal.range.start_at !== '0001-01-01'
    }
    existTemporalEnd() {
        return this.mapx.temporal.range.end_at !== '0001-01-01'
    }

    setCrs(code, url) {
        this.mapx.spatial.crs.code = code
        this.mapx.spatial.crs.url = url
    }
    getCrsCode() {
        return this.mapx.spatial.crs.code
    }

    setBBox(lngMin, lngMax, latMin, latMax) {
        this.mapx.spatial.bbox.lng_min = lngMin
        this.mapx.spatial.bbox.lng_max = lngMax
        this.mapx.spatial.bbox.lat_min = latMin
        this.mapx.spatial.bbox.lat_max = latMax
    }
    getBBox() {
        return [
            this.mapx.spatial.bbox.lng_min,
            this.mapx.spatial.bbox.lng_max,
            this.mapx.spatial.bbox.lat_min,
            this.mapx.spatial.bbox.lat_max
        ]
    }

    addContact(func, name, addr, mail) {
        this.mapx.contact.contacts.push({
            function: func,
            name: name,
            address: addr,
            email: mail
        })
    }
    getContacts() {
        return (this.mapx.contact || []).contacts
    }

    setHomepage(url) {
        this.mapx.origin.homepage.url = url
    }
    getHomepage() {
        return this.mapx.origin.homepage.url
    }

    addSource(url, isDownloadLink) {
        this.mapx.origin.source.urls.push({
            is_download_link: isDownloadLink,
            url: url
        })
    }
    getSources() {
        return this.mapx.origin.source.urls
    }

    setLicenseDownload(allow) {
        this.mapx.license.allowDownload = !!allow
    }

    addLicense(name, text) {
        this.mapx.license.licenses.push({
            name: name,
            text: text
        })
    }
    getLicenses() {
        return this.mapx.license.licenses
    }

    addReference(url) {
        this.mapx.annex.references.push({
            url: url
        })
    }
    getReferences() {
        var ret = []
        for (var u of this.mapx.annex.references) {
            ret.push(u.url)
        }
        return ret
    }


}


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


function initLanguages(map, name) {
    var i18nmap = {}
    map[name] = i18nmap

    for (const lang of LANGUAGES) {
        i18nmap[lang] = ''
    }

    return i18nmap
}

function checkLang(langCode) {
    return LANGUAGES.includes(langCode)
}

export function checkDate(date) {
    if (date && date.length === 4) {
        return false
    }
    var timestamp = Date.parse(date)
    return !isNaN(timestamp)
}