import * as i2m from './convert_iso_to_mapx.js'
import * as m2i from './convert_mapx_to_iso.js'
import * as utils from './mapx_utils.js'

/**
 * Transforms an ISO19139 xml string into a MAPX json string.
 *
 * @param {string} isoString - an iso19139 XML string
 * @param {obj} params - misc params to the function: \n
 *  - MESSAGE_HANDLER: class handling logging and collecting messages
 *
 * @returns {string} - a MAPX object as json string
 */
export function iso19139ToMapx(isoString, params) {
    return i2m.iso19139ToMapx(isoString, params)
}

/**
 * Transforms a MAPX json string into a ISO19139 xml string.
 *
 * @param {string} mapxString - a MAPX object as json string
 * @param {obj} params - misc params to the function: \n
 *  - MESSAGE_HANDLER: class handling logging and collecting messages
 *
 * @returns {string} an iso19139 XML string
 */
export function mapxToIso19139(mapxString, params) {
    return m2i.mapxToIso19139(mapxString, params)
}

/**
 * @class
 * @classdesc Sample class for storing/logging warning and info messages.
 * Needed functions:
 * - log(message)
 * - warn(message)
 */
export class ExportedMessageHandler extends utils.DefaultMessageHandler {}