// Converts a MAPX object into a ISO19139 document (json format)
//
// Author: Emanuele Tajariol (GeoSolutions) <etj@geo-solutions.it>

import * as MAPX from './mapx.js'
import * as UTILS from './mapx_utils.js'

import MD5 from 'crypto-md5/md5.js'
import builder from 'xmlbuilder'

import htmlToText from 'html-to-text'

/**
 * Transforms a MAPX json text into a ISO19139 xml text.
 *
 * @param {string} mapxText - a MAPX object as json string
 *
 * @returns {string} an iso19139 XML string
 */
export function mapxToIso19139(mapxText) {
    var mapxObj = JSON.parse(mapxText)
    var mapx = new MAPX.MapX(mapxObj)
    var iso = mapxToIso19139Internal(mapx, null)
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
 * @param {string} mapx - a MAPX object
 * @param {obj} params - a multipurpose obj for passing extra params
 *
 * @returns {string} an iso19139 XML object
 */
export function mapxToIso19139Internal(mapx, params) {
    //  var log = params ? params[UTILS.PARAM_LOG_INFO_NAME] : false;

    var fileIdentifier = 'TODO'
    var lang = 'en'

    var metadata = {}
    metadata['@xmlns:gmd'] = 'http://www.isotc211.org/2005/gmd'
    metadata['@xmlns:gco'] = 'http://www.isotc211.org/2005/gco'
    metadata['@xmlns:gml'] = 'http://www.opengis.net/gml'

    metadata['gmd:fileIdentifier'] = {
        'gco:CharacterString': fileIdentifier
    }
    metadata['gmd:language'] = {
        'gco:CharacterString': lang
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

    // current date
    metadata['gmd:dateStamp'] = {
        'gco:Date': new Date().toISOString()
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

    var useReleaseDate = mapx.existReleaseDate() && MAPX.checkDate(mapx.getReleaseDate())
    if (useReleaseDate) {
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

    var identification = {}
    identification['gmd:citation'] = {
        'gmd:CI_Citation':
        // title
        {
            'gmd:title': {
                'gco:CharacterString': mapx.getTitle(lang)
            },
            'gmd:date': dates
        }
    }

    // abstract
    var ab = mapx.getAbstract(lang)
    ab = htmlToText.fromString(ab, {
        tables: true
    })

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
        for (var l of licenses) {
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

    var note = mapx.getNotes(lang)
    if (note) {
        note = htmlToText.fromString(note, {
            tables: true
        })

        suppInfo.push(note)
    }

    var attnames = mapx.getAttributeNames()
    var attsuppinfo
    if (attnames) {
        var attlist = []
        for (var attname of attnames) {
            var attval = mapx.getFirstAttributeVal(attname)
            var attstring = attval ? `${attname}: ${attval}` : attname
            attlist.push(attstring)
        }
        attsuppinfo = `Attributes description: ${attlist.join('; ')}.`
        suppInfo.push(attsuppinfo)
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