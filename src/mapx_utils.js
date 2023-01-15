/*
 */

export const PARAM_LOG_INFO_NAME = 'log_info'
export const PARAM_LOG_DEBUG_NAME = 'log_debug'
export const PARAM_MESSAGE_HANDLER = 'MESSAGE_HANDLER'

export const DEFAULT_MISSING_CONTENT = 'N/A'

export const LANG_MAPPING_I2M = {
    eng: 'en',
    fre: 'fr',
    fra: 'fr',
    spa: 'es',
    rus: 'ru',
    chi: 'zh',
    zho: 'zh',
    deu: 'de',
    ger: 'de',
    ben: 'bn',
    per: 'fa',
    fas: 'fa',
    pus: 'ps',
    ara: 'ar'
}

export const LANG_MAPPING_M2I = {
    en: 'eng',
    fr: 'fra',
    es: 'spa',
    ru: 'rus',
    zh: 'chi',
    //          "zh" : "zho",
    de: 'ger',
    bn: 'ben',
    fa: 'per',
    ps: 'pus',
    ar: 'ara'
}

export const FREQ_MAPPING_I2M = {
    continual: 'continual',
    daily: 'daily',
    weekly: 'weekly',
    fortnightly: 'fortnightly',
    monthly: 'monthly',
    quarterly: 'quarterly',
    biannually: 'biannually',
    annually: 'annually',
    asNeeded: 'as_needed',
    irregular: 'irregular',
    notPlanned: 'not_planned',
    unknown: 'unknown'
}

export const FREQ_MAPPING_M2I = {
    continual: 'continual',
    daily: 'daily',
    weekly: 'weekly',
    fortnightly: 'fortnightly',
    monthly: 'monthly',
    quarterly: 'quarterly',
    biannually: 'biannually',
    annually: 'annually',
    as_needed: 'asNeeded',
    irregular: 'irregular',
    not_planned: 'notPlanned',
    unknown: 'unknown'
}

export const ROLE_MAPPING_TRANS = {
    resourceProvider: 'Resource provider',
    custodian: 'Custodian',
    owner: 'Owner',
    user: 'User',
    distributor: 'Distributor',
    originator: 'Originator',
    pointOfContact: 'Point of Contact',
    principalInvestigator: 'Principal investigator',
    processor: 'Processor',
    publisher: 'Publisher',
    author: 'Author'
}

export function getLogger(params) {
    if (params === null || typeof params == 'undefined') {
        params = {}
    }

    return PARAM_MESSAGE_HANDLER in params ? params[PARAM_MESSAGE_HANDLER] : new DefaultMessageHandler()
}


export class DefaultMessageHandler {

    constructor() {
        this.messages = []
    }

    warn(message) {
        console.warn(message)
        this.messages.push(message)
    }

    log(message) {
        // this.messages.push(message) // to be used for test only
        console.log(`INFO: ${message}`)
    }

    messages() {
        console.log("MESSAGES REQUESTED: " + this.messages.length)
        return this.messages
    }
}