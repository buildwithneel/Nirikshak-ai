"""
Multilingual declaration keyword and pattern dictionaries for Legal Metrology inspections.
Supports English (en), Hindi (hi), and Gujarati (gu) packaging label conventions.
"""

# Units mapping & normalization
QUANTITY_UNITS = {
    # Mass
    "g": "g",
    "gm": "g",
    "gms": "g",
    "gram": "g",
    "grams": "g",
    "ग्राम": "g",
    "ગ્રામ": "g",
    "kg": "kg",
    "kgs": "kg",
    "kilogram": "kg",
    "kilograms": "kg",
    "किग्रा": "kg",
    "किलोग्राम": "kg",
    "કિગ્રા": "kg",
    "કિલોગ્રામ": "kg",
    "mg": "mg",
    "milligram": "mg",
    "मिलीग्राम": "mg",
    "મિલીગ્રામ": "mg",
    # Volume
    "ml": "ml",
    "mls": "ml",
    "millilitre": "ml",
    "milliliter": "ml",
    "मि.ली.": "ml",
    "मिली": "ml",
    "મિલી": "ml",
    "l": "L",
    "lt": "L",
    "ltr": "L",
    "litre": "L",
    "liter": "L",
    "लीटर": "L",
    "લિટર": "L",
    # Count / Units
    "n": "units",
    "no": "units",
    "nos": "units",
    "u": "units",
    "unit": "units",
    "units": "units",
    "पीस": "units",
    "નંગ": "units",
}

# Manufacturer / Packer / Importer semantic prefixes & triggers
MANUFACTURER_TRIGGERS = {
    "en": [
        "manufactured by",
        "manufactured & packed by",
        "manufactured and packed by",
        "mfg. by",
        "mfg by",
        "mfd. by",
        "mfd by",
        "packed by",
        "pkd. by",
        "pkd by",
        "marketed by",
        "imported by",
        "importer",
        "manufacturer",
        "packer",
        "producer",
        "pvt ltd",
        "private limited",
        "ltd",
        "limited",
        "plot no",
        "gidc",
        "midc",
        "industrial area",
        "estate",
    ],
    "hi": [
        "निर्माता",
        "द्वारा निर्मित",
        "निर्मित एवं पैक किया गया",
        "पैक किया गया द्वारा",
        "विपणनकर्ता",
        "आयातक",
        "निर्मित",
        "प्रा. लि.",
        "प्राइवेट लिमिटेड",
        "लिमिटेड",
        "औद्योगिक क्षेत्र",
    ],
    "gu": [
        "ઉત્પાદક",
        "દ્વારા ઉત્પાદિત",
        "પેકર",
        "દ્વારા પેક કરેલ",
        "બજારકર્તા",
        "આયાતકાર",
        "પ્રા. લિ.",
        "પ્રાઇવેટ લિમિટેડ",
        "ઔદ્યોગિક વસાહત",
    ],
}

# Net Quantity semantic triggers
QUANTITY_TRIGGERS = {
    "en": [
        "net quantity",
        "net qty",
        "net weight",
        "net wt",
        "net volume",
        "net vol",
        "quantity",
        "weight",
        "volume",
        "nett",
        "qty",
        "wt",
    ],
    "hi": [
        "शुद्ध मात्रा",
        "शुद्ध वजन",
        "कुल मात्रा",
        "मात्रा",
        "वजन",
    ],
    "gu": [
        "ચોખ્ખું વજન",
        "ચોખ્ખી માત્રા",
        "કુલ જથ્થો",
        "માત્રા",
        "વજન",
    ],
}

# MRP triggers & tax phrases
MRP_TRIGGERS = {
    "en": [
        "maximum retail price",
        "m.r.p",
        "mrp",
        "retail price",
        "rsp",
        "price",
        "rs.",
        "rs",
        "inr",
        "₹",
    ],
    "hi": [
        "अधिकतम खुदरा मूल्य",
        "खुदरा मूल्य",
        "एम.आर.पी",
        "मूल्य",
        "रु.",
        "रुपये",
    ],
    "gu": [
        "મહત્તમ છૂટક કિંમત",
        "છૂટક કિંમત",
        "એમ.આર.પી",
        "કિંમત",
        "રૂ.",
        "રૂપિયા",
    ],
}

TAX_INCLUSIVE_TRIGGERS = {
    "en": [
        "incl. of all taxes",
        "inclusive of all taxes",
        "incl of all taxes",
        "all taxes included",
        "incl. taxes",
        "incl taxes",
    ],
    "hi": [
        "सभी करों सहित",
        "सभी कर सहित",
        "करों सहित",
    ],
    "gu": [
        "તમામ કર સહિત",
        "બધા કર સહિત",
        "કર સહિત",
    ],
}

# Unit Sale Price (Rule 6(1)(da) mandate for multi-quantity items)
UNIT_SALE_PRICE_TRIGGERS = {
    "en": [
        "unit sale price",
        "usp",
        "per g",
        "per kg",
        "per ml",
        "per l",
        "per piece",
        "per unit",
        "/ g",
        "/ kg",
        "/ ml",
        "/ l",
    ],
    "hi": [
        "इकाई विक्रय मूल्य",
        "प्रति ग्राम",
        "प्रति किग्रा",
        "प्रति मिली",
    ],
    "gu": [
        "એકમ વેચાણ કિંમત",
        "પ્રતિ ગ્રામ",
        "પ્રતિ કિગ્રા",
    ],
}

# Consumer Care semantic triggers
CONSUMER_CARE_TRIGGERS = {
    "en": [
        "consumer care",
        "customer care",
        "customer service",
        "consumer redressal",
        "helpline",
        "toll free",
        "toll-free",
        "call us",
        "contact us",
        "reach us at",
        "feedback",
        "write to us",
        "care@",
        "support@",
        "feedback@",
        "help@",
    ],
    "hi": [
        "ग्राहक सेवा",
        "उपभोक्ता सेवा",
        "टोल फ्री",
        "संपर्क करें",
        "शिकायत निवारण",
        "हेल्पलाइन",
    ],
    "gu": [
        "ગ્રાહક સેવા",
        "ઉપભોક્તા સંભાળ",
        "ટોલ ફ્રી",
        "સંપર્ક કરો",
        "હેલ્પલાઇન",
    ],
}

# Date of Manufacture / Packaging triggers
DATE_TRIGGERS = {
    "en": [
        "mfg date",
        "mfg. date",
        "mfd date",
        "date of mfg",
        "date of manufacture",
        "pkd date",
        "pkd. date",
        "packed date",
        "date of packaging",
        "date of packing",
        "month & year",
        "mfg:",
        "mfd:",
        "pkd:",
    ],
    "hi": [
        "निर्माण तिथि",
        "पैकिंग तिथि",
        "निर्माण माह",
    ],
    "gu": [
        "ઉત્પાદન તારીખ",
        "પેકિંગ તારીખ",
    ],
}
