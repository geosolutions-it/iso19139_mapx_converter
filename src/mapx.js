// Model for an object containing MAPX information.
//
// Author: Emanuele Tajariol (GeoSolutions) <etj@geo-solutions.it>

export const LANGUAGES = ['en', 'fr', 'es', 'ru', 'zh', 'de', 'bn', 'fa', 'ps', 'ar']
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

    constructor(obj, logger=console) {
        this.logger = logger
        this.mapx = fixObject(obj, logger)
    }

    load(obj) {
        this.mapx = fixObject(obj, this.logger)
    }

    setLogger(logger) {
        this.logger = logger
    }

    getLogger() {
        return this.logger
    }

    setTitle(lang, value) {
        if (!checkLang(lang)) {
            this.logger.warn(`Can't set title: unknown language [${lang}]`)
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
            this.logger.warn(`Can't set abstract: unknown language [${lang}]`)
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
            this.logger.warn(`Can't set note: unknown language [${lang}]`)
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
            this.logger.warn(`Can't add note: unknown language [${lang}]`)
            return false
        }

        if (value) {
            var old = this.mapx.text.notes[lang]
            var sep = old.length === 0 ? '' : '. '

            var note = title ? `${old}${sep}${title}: ${value}` : `${old}${sep}${value}`

            this.mapx.text.notes[lang] = note
        }
        return true
    }

    addKeyword(keyword) {
        this.mapx.text.keywords.keys.push(keyword)
    }
    getKeywords() {
        return this.mapx.text.keywords.keys
    }

    _fixTopics() {
        if (!Object.prototype.hasOwnProperty.call(this.mapx.text.keywords, 'topics')) {
            this.logger.warn(`Topics field missing. Fixing.`)
            this.mapx.text.keywords.topics = {}
        }
    }
    addTopic(topic) {
        if (!TOPICS.includes(topic)) {
            this.logger.warn(`Can't set topic: unknown topic [${topic}]`)
            return false
        }
        this._fixTopics()
        this.mapx.text.keywords.topics.push(topic)
        return true
    }
    getTopics() {
        this._fixTopics()
        return this.mapx.text.keywords.topics
    }

    addLanguage(lang) {
        if (!checkLang(lang)) {
            this.logger.warn(`Can't add unknown language [${lang}]`)
            return false
        }

        this.mapx.text.language.codes.push({
            'code': lang
        })
        return true
    }
    getLanguages() {
        var ret = []
        for (var code of this.mapx.text.language.codes) {
            ret.push(code.code)
        }
        return ret
    }

    _fixAttributes() {
        if (!Object.prototype.hasOwnProperty.call(this.mapx.text, 'attributes')) {
            this.logger.warn(`Attributes field missing. Fixing.`)
            this.mapx.text.attributes = {}
        }
    }
    setAttribute(lang, attname, value) {
        if (!checkLang(lang)) {
            this.logger.warn(`Can't set attribute: unknown language [${lang}]`)
            return false
        }
        this._fixAttributes()

        var attr = this.mapx.text.attributes[attname] || initLanguages(this.mapx.text.attributes, attname)
        attr[lang] = value
        return true
    }
    getAttributeVal(lang, attname) {
        this._fixAttributes()
        var attr = this.mapx.text.attributes[attname]
        return attr ? attr[lang] : undefined
    }
    getFirstAttributeVal(attname) {
        this._fixAttributes()
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
        this._fixAttributes()
        return this.mapx.text.attributes
    }
    getAttributeNames() {
        this._fixAttributes()
        return Object.getOwnPropertyNames(this.mapx.text.attributes)
    }

    setReleaseDate(date) {
        if (!checkDate(date)) {
            this.logger.warn(`Can't set release date: bad date [${date}]`)
            return false
        }
        this.mapx.temporal.issuance.released_at = date
        return true
    }
    getReleaseDate() {
        return this.mapx.temporal.issuance.released_at
    }
    existReleaseDate() {
        return this.mapx.temporal.issuance.released_at !== '0001-01-01'
    }

    setModifiedDate(date) {
        if (!checkDate(date)) {
            this.logger.warn(`Can't set modified date: bad date [${date}]`)
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
            this.logger.warn(`Can't set unknown periodicity [${periodicity}]`)
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
            this.logger.warn(`Can't set temporal start: bad date [${date}]`)
            return false
        }
        this.mapx.temporal.range.start_at = date
        this.mapx.temporal.range.is_timeless = false
        return true
    }
    setTemporalEnd(date) {
        if (!checkDate(date)) {
            this.logger.warn(`Can't set temporal end: bad date [${date}]`)
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
        if (lngMin) this.mapx.spatial.bbox.lng_min = Number(lngMin)
        if (lngMax) this.mapx.spatial.bbox.lng_max = Number(lngMax)
        if (latMin) this.mapx.spatial.bbox.lat_min = Number(latMin)
        if (latMax) this.mapx.spatial.bbox.lat_max = Number(latMax)
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

/**
 * Creates the mapx schema
 *
 * @returns {obj} - the MAPX schema
 */
function createSchema() {
    var schema = {
        'text': { 'mandatory': true, 'default': {}, 'children': {
            'title': {'mandatory': true, 'default': {}},
            'abstract': {'mandatory': true, 'default': {}},
            'notes': {'mandatory': true, 'default': {}},
            'keywords': {'mandatory': true, 'default': {}, 'children': {
                'keys' : {'mandatory': true, 'default': []},
                'topics' : {'mandatory': true, 'default': []}}
            },
            'attributes': {'mandatory': false, 'default': {}},
            'attributes_alias': {'mandatory': false, 'default': {}},
            'language': {'mandatory': true, 'default': {}, 'children': {
                'codes' : {'mandatory': true, 'default': []}}
            }}
        },
        'temporal': {'mandatory': true, 'default': {}, 'children': {
            'issuance' : {'mandatory': true, 'default': {}, 'children': {
                'periodicity' : {'mandatory': true, 'default': 'unknown'},
                'released_at' : {'mandatory': true, 'default': '0001-01-01'},
                'modified_at' : {'mandatory': true, 'default': '0001-01-01'}}
            },
            'range' : {'mandatory': true, 'default': {}, 'children': {
                'is_timeless' : {'mandatory': true, 'default': true},
                'start_at' : {'mandatory': false, 'default': '0001-01-01'},
                'end_at' : {'mandatory': false, 'default': '0001-01-01'}}
            },
        }},
        'spatial': {'mandatory': true, 'default': {}, 'children': {
            'crs' : {'mandatory': true, 'default': {}, 'children': {
                'code' : {'mandatory': true, 'default': 'EPSG:4326'},
                'url' : {'mandatory': true, 'default': '0001-01-01'}}
            },
            'bbox' : {'mandatory': true, 'default': {}, 'children': {
                'lng_min' : {'mandatory': true, 'default': -180},
                'lng_max' : {'mandatory': true, 'default': 180},
                'lat_min' : {'mandatory': true, 'default': -90},
                'lat_max' : {'mandatory': true, 'default': 90}}
            },
        }},
        'contact': {'mandatory': true, 'default': {}, 'children': {
            'contacts' : {'mandatory': true, 'default': []}}
        },
        'origin': {'mandatory': true, 'default': {}, 'children': {
            'homepage' : {'mandatory': true, 'default': {}, 'children': {
                'url' : {'mandatory': true, 'default': undefined}}
            },
            'source': {'mandatory': true, 'default': {}, 'children': {
                'urls' : {'mandatory': true, 'default': []}}
            }
        }},
        'license': {'mandatory': true, 'default': {}, 'children': {
            'licenses' : {'mandatory': true, 'default': []}}
        },
        'annex': {'mandatory': true, 'default': {}, 'children': {
            'references' : {'mandatory': true, 'default': [] }}
        },
    }

    attachLanguages(schema, ['text', 'title'])
    attachLanguages(schema, ['text', 'abstract'])
    attachLanguages(schema, ['text', 'notes'])

    return schema
}

function attachLanguages(schema, path) {
    var el = schema
    for (const step of path) {
        var info = el[step]
        el = info.children
    }
    var children = info['children']
    if (children === undefined) {
        children = {}
        info['children'] = children
    }

    for (const lang of LANGUAGES) {
        children[lang] = {'mandatory': false, 'default': ''}
    }
}

/**
 * Validate and fix a mapx object according to the schema.
 * If the passed mapx object is null, a valid minimalistic mpax object will be created.
 *
 * @param {obj} mapx - a wannabe mapx object
 * @param {obj} logger - (optional) an object handling logging and collecting messages
 *
 * @returns {obj} - the MAPX schema
 */
function fixObject(mapx, logger=console) {
    var do_checks = true
    if (mapx === undefined) {
        mapx = {}
        do_checks = false  // we're initializing the object
    }

    // check / fix static content
    var schema = createSchema()
    _checkSchema(schema, mapx, do_checks, logger)

    // copy dynamic content (attributes stuff)
    fixAttribs(mapx, 'attributes', logger)
    fixAttribs(mapx, 'attributes_alias', logger)

    return mapx
}

function fixAttribs(mapx, attr_field, logger=console) {
    var attributes = mapx.text[attr_field]
    if (attributes === undefined)
        return
    for (const [attr_name, langs] of Object.entries(attributes)) {
        var missing_lang = new Set()
        for (const lang of LANGUAGES) {
            if (!Object.prototype.hasOwnProperty.call(langs, lang)) {
                missing_lang.add(lang)
                langs[lang] = ''
            }
        }
        if (missing_lang.size > 0) {
            logger.warn(`${attr_field} ${attr_name} is missing languages: ${missing_lang}`)
        }
    }
}

/**
 * Recursively validate and fix a mapx object according to the schema.
 *
 * @param {obj} schema_nodes - sibling nodes
 * @param {obj} mapx_element - a node in the mapx object -- first call uses the whole mapx object
 * @param {bool} do_checks - we want to log messages only if a parent node has not been logged yet.
 *                           Also, log is diable on mapx creation from scratch.
 * @param {obj} logger - (optional) an object handling logging and/or collecting messages
 */
function _checkSchema(schema_nodes, mapx_element, do_checks, logger) {
    for (const [schema_field_name, info] of Object.entries(schema_nodes)) {
        // logger.warn(`CHECKING element [${fieldname}]`)
        var el = null
        var do_checks_in_node = do_checks
        if (!Object.prototype.hasOwnProperty.call(mapx_element, schema_field_name)) {
            if (info.mandatory) {
                if(do_checks) {
                    logger.warn(`Missing mandatory element [${schema_field_name}]`)
                    do_checks_in_node = false
                }
            }
            el = info.default  // create the missing element (even if it is not mandatory
            mapx_element[schema_field_name] = el
        } else {
            el = mapx_element[schema_field_name]
        }

        var children = info['children']
        if (children !== undefined) {
            // var c = JSON.stringify(children, null, 3)
            // logger.warn(`children for ${fieldname} --> ${c}`)
            _checkSchema(children, el, do_checks_in_node, logger)
        }
    }
}

function getOrCreate(object, fieldname, val={}) {
    if (!Object.prototype.hasOwnProperty.call(object, fieldname)) {
        object[fieldname] = val
    }
    return object[fieldname]
}

function initLanguages(map, name) {

    var i18nmap = getOrCreate(map, name)

    for (const lang of LANGUAGES) {
        getOrCreate(i18nmap, lang, '')
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