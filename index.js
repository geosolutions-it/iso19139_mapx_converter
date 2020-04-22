import * as i2m from "./convert_iso_to_mapx.js";
import * as m2i from "./convert_mapx_to_iso.js";

export function iso19139_to_mapx(iso_text) {
    return i2m.iso19139_to_mapx_t_t(iso_text);
}

export function mapx_to_iso19139(mapx_text) {
    return m2i.mapx_to_iso19139_t_t(mapx_text);
}

