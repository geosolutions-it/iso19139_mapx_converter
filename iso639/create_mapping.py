import json


with open('iso_639-1.json') as file:
    base = json.load(file)



print('export const LANG_MAPPING_M2I_EXT = {')
#    en: 'eng',
#    fr: 'fra',
#    es: 'spa',

for code_2 in base:
    lang = base[code_2]
    print(f"  {code_2}: '{lang['639-2']}',")

print('}')
print('')
print('')


print('export const LANG_MAPPING_I2M_EXT = {')
#    eng: 'en',
#    fre: 'fr',

for code_2 in base:
    lang = base[code_2]
    print(f"  {lang['639-2']}: '{code_2}',")
    if '639-2/B' in lang:
        print(f"  {lang['639-2/B']}: '{code_2}',")

print('}')
print('')
print('')
