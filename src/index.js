import * as i2m from './convert_iso_to_mapx.js'
import * as m2i from './convert_mapx_to_iso.js'

/**
 * Transforms an ISO19139 xml string into a MAPX json string.
 *
 * @param {string} isoString - an iso19139 XML string
 *
 * @returns {string} - a MAPX object as json string
 */
export function iso19139ToMapx(isoString) {
    return i2m.iso19139ToMapx(isoString)
}

/**
 * Transforms a MAPX json string into a ISO19139 xml string.
 *
 * @param {string} mapxString - a MAPX object as json string
 *
 * @returns {string} an iso19139 XML string
 */
export function mapxToIso19139(mapxString) {
    return m2i.mapxToIso19139(mapxString)
}