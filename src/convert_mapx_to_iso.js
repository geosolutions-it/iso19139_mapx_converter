// Converts a MAPX object into a ISO19139 document (json format)
//
// Author: Emanuele Tajariol (GeoSolutions) <etj@geo-solutions.it>

import * as MAPX from './mapx.js'
import * as UTILS from './mapx_utils.js'

import MD5 from 'crypto-md5/md5.js'
import builder from 'xmlbuilder'

import htmlToText from 'html-to-text'
import he from 'he'

/**
 * Transforms a MAPX json text into a ISO19139 xml text.
 *
 * @param {string} mapxText - a MAPX object as json string
 *
 * @returns {string} an iso19139 XML string
 */
export function mapxToIso19139(mapxText, params) {
    var mapxObj = JSON.parse(mapxText)
    var mapx = new MAPX.MapX(mapxObj, UTILS.getLogger(params))
    var iso = mapxToIso19139Internal(mapx, params)
    var isoxml = builder.create(iso, {
        encoding: 'utf-8'
    })
    var isotext = isoxml.end({
        pretty: true
    })
    return isotext
}

/**
 * Transforms a MAPX object into a ISO19139 object.
 *
 * @param {MapX} mapx - a MAPX object. We expect the logger to be already set.
 * @param {obj} params - a multipurpose obj for passing extra params
 *
 * @returns {string} an iso19139 XML object
 */
export function mapxToIso19139Internal(mapx, params) {
    var logger = UTILS.getLogger(params)

    // generic loop var
    var l

    var fileIdentifier = 'TODO'

    var metadata = {}
    metadata['@xmlns:gmd'] = 'http://www.isotc211.org/2005/gmd'
    metadata['@xmlns:gco'] = 'http://www.isotc211.org/2005/gco'
    metadata['@xmlns:gml'] = 'http://www.opengis.net/gml'

    metadata['gmd:fileIdentifier'] = {
        'gco:CharacterString': fileIdentifier
    }

    var mdLang = 'eng' // language to be set as metadata language

    var dataLangList = [] // languages to be set as data languages
    for (l of mapx.getLanguages()) {
        var ilang = UTILS.M2I_lang_map(l)
        if (ilang) {
            dataLangList.push(ilang)
        } else {
            logger.warn(`Can't map language [${l}]`)
        }
    }
    if (dataLangList.length == 0) {
        logger.warn('No valid language found. Default to [eng]')
        dataLangList.push('eng')
    }

    metadata['gmd:language'] = {
        'gmd:LanguageCode': {
            '@codeList': 'http://www.loc.gov/standards/iso639-2/',
            '@codeListValue': mdLang
        }
    }

    var metadataContacts = []
    var dataContacts = []

    for (var c of mapx.getContacts()) {
        var f = c.function
        metadataContacts.push(createResponsibleParty(c))
        if (!f.toLowerCase().includes('metadata')) {
            dataContacts.push(createResponsibleParty(c))
        }
    }

    metadata['gmd:contact'] = metadataContacts

    // current date in yyyy-mm-dd format
    var defaultDate = new Date().toISOString().substring(0, 10)

    metadata['gmd:dateStamp'] = {
        'gco:Date': defaultDate
    }

    // crs
    metadata['gmd:referenceSystemInfo'] = {
        'gmd:MD_ReferenceSystem': {
            'gmd:referenceSystemIdentifier': {
                'gmd:RS_Identifier': {
                    'gmd:code': {
                        'gco:CharacterString': mapx.getCrsCode()
                    }
                }
            }
        }
    }

    var dates = []
    var identDateAdded = false

    var useReleaseDate = mapx.existReleaseDate() && MAPX.checkDate(mapx.getReleaseDate())
    if (useReleaseDate) {
        identDateAdded = true
        dates.push({
            'gmd:CI_Date': {
                'gmd:date':
                // modified date --> dataset
                {
                    'gco:Date': mapx.getReleaseDate()
                },
                'gmd:dateType': {
                    'gmd:CI_DateTypeCode': {
                        '@codeListValue': 'publication',
                        '@codeList': 'http://standards.iso.org/ittf/PubliclyAvailableStandards/ISO_19139_Schemas/resources/codelist/ML_gmxCodelists.xml#CI_DateTypeCode'
                    }
                }
            }
        })
    }

    var useModifiedDate = mapx.existModifiedDate() && MAPX.checkDate(mapx.getModifiedDate())
    if (useModifiedDate &&
        (!useReleaseDate ||
            (mapx.getModifiedDate() !== mapx.getReleaseDate()))) {
        identDateAdded = true
        dates.push({
            'gmd:CI_Date': {
                'gmd:date':
                // modified date --> dataset
                {
                    'gco:Date': mapx.getModifiedDate()
                },
                'gmd:dateType': {
                    'gmd:CI_DateTypeCode': {
                        '@codeListValue': 'revision',
                        '@codeList': 'http://standards.iso.org/ittf/PubliclyAvailableStandards/ISO_19139_Schemas/resources/codelist/ML_gmxCodelists.xml#CI_DateTypeCode'
                    }
                }
            }
        })
    }

    if (!identDateAdded) {
        logger.warn(`No dataset reference date given.`)
    }

    var identification = {}

    var title = extractLocalized(mapx.getAllTitles(), logger)
    if (title == UTILS.DEFAULT_MISSING_CONTENT) {
        logger.warn("Can't generate mandatory ISO element: title")
    }
    identification['gmd:citation'] = {
        'gmd:CI_Citation':
        // title
        {
            'gmd:title': {
                'gco:CharacterString': title
            },
            'gmd:date': dates
        }
    }

    // abstract
    var ab = extractLocalized(mapx.getAllAbstracts(), logger)
    if (ab == UTILS.DEFAULT_MISSING_CONTENT) {
        logger.warn("Can't generate mandatory ISO element: abstract")
    }

    ab = _htmlToText(ab)

    identification['gmd:abstract'] = {
        'gco:CharacterString': ab
    }

    // data points of concat
    identification['gmd:pointOfContact'] = dataContacts

    // frequency
    identification['gmd:resourceMaintenance'] = {
        'gmd:MD_MaintenanceInformation': {
            'gmd:maintenanceAndUpdateFrequency': {
                'gmd:MD_MaintenanceFrequencyCode': {
                    '@codeListValue': UTILS.FREQ_MAPPING_M2I[mapx.getPeriodicity()],
                    '@codeList': 'http://standards.iso.org/ittf/PubliclyAvailableStandards/ISO_19139_Schemas/resources/codelist/ML_gmxCodelists.xml#MD_MaintenanceFrequencyCode'
                }
            }
        }
    }

    // gather keywords
    var keywordList = []
    for (var kw of mapx.getKeywords()) {
        keywordList.push({
            'gco:CharacterString': kw
        })
    }

    if (keywordList.length > 0) {
        identification['gmd:descriptiveKeywords'] = {
            'gmd:MD_Keywords': {
                'gmd:keyword': keywordList
            }
        }
    }

    // licenses
    // gmd:resourceConstraints 0..N
    var licenses = mapx.getLicenses()
    if (licenses.length > 0) {
        var oc = []
        for (l of licenses) {
            var larr = []
            if (l.name) {
                larr.push(l.name)
            }
            if (l.text) {
                larr.push(l.text)
            }
            oc.push({
                'gco:CharacterString': larr.join(': ')
            })
        }
        identification['gmd:resourceConstraints'] = {
            'gmd:MD_LegalConstraints': {
                'gmd:accessConstraints': {
                    'gmd:MD_RestrictionCode': {
                        '@codeListValue': 'otherRestrictions',
                        '@codeList': 'http://standards.iso.org/ittf/PubliclyAvailableStandards/ISO_19139_Schemas/resources/codelist/ML_gmxCodelists.xml#MD_RestrictionCode'
                    }
                },
                'gmd:otherConstraints': oc
            }
        }
    }

    var langElementList = []
    for (const isoLangLoop of dataLangList) {
        langElementList.push({
            'gmd:LanguageCode': {
                '@codeList': 'http://www.loc.gov/standards/iso639-2/',
                '@codeListValue': isoLangLoop
            }
        })
    }
    identification['gmd:language'] = langElementList

    var topics = mapx.getTopics()
    if (topics.length > 0) {
        var topicCategory = []
        for (var topic of topics) {
            topicCategory.push({
                'gmd:MD_TopicCategoryCode': topic
            })
        }
        identification['gmd:topicCategory'] = topicCategory
    }

    var extents = []

    // bbox
    var [x0, x1, y0, y1] = mapx.getBBox()
    extents.push({
        'gmd:EX_Extent': {
            'gmd:geographicElement': {
                'gmd:EX_GeographicBoundingBox': {
                    'gmd:westBoundLongitude': {
                        'gco:Decimal': x0
                    },
                    'gmd:eastBoundLongitude': {
                        'gco:Decimal': x1
                    },
                    'gmd:southBoundLatitude': {
                        'gco:Decimal': y0
                    },
                    'gmd:northBoundLatitude': {
                        'gco:Decimal': y1
                    }
                }
            }
        }
    })

    // temporal
    if (!mapx.isTimeless()) {
        var period = {}
        period['@gml:id'] = 'missing'

        var addExtent = false

        if (mapx.existTemporalStart()) {
            var date = mapx.getTemporalStart()
            if (MAPX.checkDate(date)) {
                period['gml:beginPosition'] = date
                addExtent = true
            }
        }
        if (mapx.existTemporalEnd()) {
            date = mapx.getTemporalEnd()
            if (MAPX.checkDate(date)) {
                period['gml:endPosition'] = date
                addExtent = true
            }
        }

        if (addExtent) {
            extents.push({
                'gmd:EX_Extent': {
                    'gmd:temporalElement': {
                        'gmd:EX_TemporalExtent': {
                            'gmd:extent': {
                                'gml:TimePeriod': period
                            }
                        }
                    }
                }
            })
        }
    }

    identification['gmd:extent'] = extents

    // supplementalInformation
    var suppInfo = []

    var note = extractLocalized(mapx.getAllNotes(), logger)
    if (note) {
        note = _htmlToText(note)
        suppInfo.push(note)
    }

    // Encoding attributes into text, so that they can be parsed back as
    // couples (key, value).
    //
    // SUPPINFOATTDESC := "Attributes description: " : ATTLIST
    // ATTLIST := ATTCOUPLE | ATTCOUPLE "; " ATTLIST
    // ATTCOUPLE := ATTNAME ": " ATTVALUE
    // ATTNAME := string
    // ATTVALUE := string
    // In order to use ";" and ":" as separators, and not to be confused
    // with ";" and ":" inside ATTNAME and VALUE, we'll escape ":" and ";" in values
    // by doubling them

    var attnames = mapx.getAttributeNames()
    var attsuppinfo
    if (attnames) {
        var attlist = []
        for (var attname of attnames) {
            var attval = mapx.getFirstAttributeVal(attname)

            var escapedName = attname.replace(":", "::").replace(";", ";;")
            var escapedVal = attval ? attval.replace(":", "::").replace(";", ";;") : attval

            var attstring = attval ? `${escapedName}: ${escapedVal};` : `${escapedName};`
            attlist.push(attstring)
        }
        if (attlist.length > 0) {
            attsuppinfo = `Attributes description: ${attlist.join(' ')}`
            suppInfo.push(attsuppinfo)
        }
    }

    if (suppInfo) {
        identification['gmd:supplementalInformation'] = {
            'gco:CharacterString': suppInfo.join('\n')
        }
    }

    metadata['gmd:identificationInfo'] = {
        'gmd:MD_DataIdentification': identification
    }

    // resources
    var resources = []

    if (mapx.getHomepage()) {
        resources.push({
            'gmd:CI_OnlineResource': {
                'gmd:linkage': {
                    'gmd:URL': mapx.getHomepage()
                },
                'gmd:name': {
                    'gco:CharacterString': 'Homepage'
                }
            }
        })
    }

    // sources
    var sources = mapx.getSources()
    if (sources.length > 0) {
        for (var source of sources) {
            resources.push({
                'gmd:CI_OnlineResource': {
                    'gmd:linkage': {
                        'gmd:URL': source.url
                    },
                    'gmd:name': {
                        'gco:CharacterString': source.is_download_link ? 'Downloadable resource' : 'Other resource'
                    }
                }
            })
        }
    }

    // annexes
    var annexes = mapx.getReferences()
    if (annexes.length > 0) {
        for (var annex of annexes) {
            resources.push({
                'gmd:CI_OnlineResource': {
                    'gmd:linkage': {
                        'gmd:URL': annex
                    },
                    'gmd:name': {
                        'gco:CharacterString': 'Annex'
                    }
                }
            })
        }
    }

    var distribution = {}

    distribution['gmd:distributionFormat'] = {
        'gmd:MD_Format': {
            'gmd:name': {
                'gco:CharacterString': 'GeoJSON'
            },
            'gmd:version': {
                'gco:CharacterString': ''
            },
            'gmd:specification': {
                '@gco:nilReason': 'missing',
                'gco:CharacterString': ''
            },
        }
    }

    if (resources.length > 0) {
        distribution['gmd:transferOptions'] = {
            'gmd:MD_DigitalTransferOptions': {
                'gmd:onLine': resources
            }
        }
    }

    metadata['gmd:distributionInfo'] = {
        'gmd:MD_Distribution': distribution
    }


    // create an UUID on the hash of all the fields stored so far
    var uuid = MD5(JSON.stringify(metadata), 'hex')
    metadata['gmd:fileIdentifier'] = {
        'gco:CharacterString': uuid
    }

    var root = {
        'gmd:MD_Metadata': metadata
    }
    return root
}

function createResponsibleParty(c) {
    var func = c.function
    var name = c.name
    var addr = c.address
    var mail = c.email

    return {
        'gmd:CI_ResponsibleParty': {
            'gmd:individualName': {
                'gco:CharacterString': name
            },
            'gmd:positionName': {
                'gco:CharacterString': func
            },
            'gmd:contactInfo': {
                'gmd:CI_Contact': {
                    'gmd:address': {
                        'gmd:CI_Address': {
                            'gmd:deliveryPoint': {
                                'gco:CharacterString': addr
                            },
                            'gmd:electronicMailAddress': {
                                'gco:CharacterString': mail
                            }
                        }
                    }
                }
            },
            'gmd:role': {
                'gmd:CI_RoleCode': {
                    '@codeList': 'http://standards.iso.org/ittf/PubliclyAvailableStandards/ISO_19139_Schemas/resources/codelist/ML_gmxCodelists.xml#CI_RoleCode',
                    '@codeListValue': 'pointOfContact'
                }
            }
        }
    }
}

function _htmlToText(html) {
    return htmlToText.htmlToText(html, {
        tables: true,
        wordwrap: false,
        formatters: {
            'anchor': formatAnchor
        },
        tags: {
            'foo': {
                format: 'fooBlockFormatter',
                options: {
                    leadingLineBreaks: 1,
                    trailingLineBreaks: 1
                }
            }
        }
    })
}

function formatAnchor(elem, walk, builder, formatOptions) {
    function getHref() {
        if (formatOptions.ignoreHref) {
            return '';
        }
        if (!elem.attribs || !elem.attribs.href) {
            return '';
        }
        let href = elem.attribs.href.replace(/^mailto:/, '');
        if (formatOptions.noAnchorUrl && href[0] === '#') {
            return '';
        }
        href = (formatOptions.baseUrl && href[0] === '/') ?
            formatOptions.baseUrl + href :
            href;
        return he.decode(href, builder.options.decodeOptions);
    }
    const href = getHref();
    if (!href) {
        walk(elem.children, builder);
    } else {
        let text = '';
        builder.pushWordTransform(
            str => {
                if (str) {
                    text += str;
                }
                return str;
            }
        );
        walk(elem.children, builder);
        builder.popWordTransform();

        const hideSameLink = formatOptions.hideLinkHrefIfSameAsText && href === text;
        if (!hideSameLink) {
            builder.addInline(
                (!text) ?
                href :
                (formatOptions.noLinkBrackets) ?
                ' ' + href :
                ' (' + href + ')',
                true
            );
        }
    }
}


/**
 * Metadata is always expected as english text (#44)
 */
export function extractLocalized(localizedEntries, logger) {
    if (localizedEntries['en']) {
        return localizedEntries['en']
    } else {
        logger.log("Missing eng entry")
        return UTILS.DEFAULT_MISSING_CONTENT
    }
}