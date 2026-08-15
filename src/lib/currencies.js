;(function (root) {
  'use strict';

  const CURRENCIES = {
    USD: { name: 'US Dollar', decimals: 2, symbols: ['US$', 'USD$'], shared: ['$'], regions: ['US'] },
    EUR: { name: 'Euro', decimals: 2, symbols: ['€'], shared: [], regions: ['DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'GR', 'SK', 'SI', 'EE', 'LV', 'LT', 'LU', 'CY', 'MT', 'HR'] },
    JPY: { name: 'Japanese Yen', decimals: 0, symbols: ['円', 'JP¥'], shared: ['¥', '￥'], regions: ['JP'] },
    GBP: { name: 'British Pound', decimals: 2, symbols: ['GB£'], shared: ['£'], regions: ['GB', 'UK'] },
    CNY: { name: 'Chinese Yuan', decimals: 2, symbols: ['CN¥', 'RMB', '元', '圆', '圓'], shared: ['¥', '￥'], regions: ['CN'] },
    CNH: { name: 'Chinese Yuan (offshore)', decimals: 2, symbols: ['CNH'], shared: [], regions: ['CNH'] },
    CAD: { name: 'Canadian Dollar', decimals: 2, symbols: ['CA$', 'CAD$'], shared: ['$', 'C$'], regions: ['CA'] },
    AUD: { name: 'Australian Dollar', decimals: 2, symbols: ['AU$', 'A$'], shared: ['$'], regions: ['AU'] },
    NZD: { name: 'New Zealand Dollar', decimals: 2, symbols: ['NZ$'], shared: ['$'], regions: ['NZ'] },
    CHF: { name: 'Swiss Franc', decimals: 2, symbols: ['CHF', 'Fr.', 'SFr.'], shared: [], regions: ['CH', 'LI'] },
    HKD: { name: 'Hong Kong Dollar', decimals: 2, symbols: ['HK$'], shared: ['$'], regions: ['HK'] },
    SGD: { name: 'Singapore Dollar', decimals: 2, symbols: ['S$', 'SG$'], shared: ['$'], regions: ['SG'] },
    TWD: { name: 'New Taiwan Dollar', decimals: 0, symbols: ['NT$'], shared: ['$'], regions: ['TW'] },
    KRW: { name: 'South Korean Won', decimals: 0, symbols: ['₩', '￦', '원'], shared: [], regions: ['KR'] },
    MOP: { name: 'Macanese Pataca', decimals: 2, symbols: ['MOP$', '澳門元'], shared: [], regions: ['MO'] },
    MNT: { name: 'Mongolian Tugrik', decimals: 2, symbols: ['₮'], shared: [], regions: ['MN'] },
    KHR: { name: 'Cambodian Riel', decimals: 2, symbols: ['៛'], shared: [], regions: ['KH'] },
    LAK: { name: 'Lao Kip', decimals: 2, symbols: ['₭'], shared: [], regions: ['LA'] },
    MMK: { name: 'Myanmar Kyat', decimals: 2, symbols: ['MMK'], shared: [], regions: ['MM'] },
    BND: { name: 'Brunei Dollar', decimals: 2, symbols: [], shared: ['$', 'B$'], regions: ['BN'] },

    INR: { name: 'Indian Rupee', decimals: 2, symbols: ['₹'], shared: ['₨', 'Rs', 'Rs.'], regions: ['IN'], grouping: 'indian' },
    PKR: { name: 'Pakistani Rupee', decimals: 2, symbols: [], shared: ['₨', 'Rs', 'Rs.'], regions: ['PK'] },
    LKR: { name: 'Sri Lankan Rupee', decimals: 2, symbols: [], shared: ['₨', 'Rs', 'Rs.'], regions: ['LK'] },
    NPR: { name: 'Nepalese Rupee', decimals: 2, symbols: [], shared: ['₨', 'Rs', 'Rs.'], regions: ['NP'] },
    BDT: { name: 'Bangladeshi Taka', decimals: 2, symbols: ['৳'], shared: [], regions: ['BD'] },
    BTN: { name: 'Bhutanese Ngultrum', decimals: 2, symbols: ['Nu.'], shared: [], regions: ['BT'] },
    MVR: { name: 'Maldivian Rufiyaa', decimals: 2, symbols: ['Rf', 'MVR'], shared: [], regions: ['MV'] },
    AFN: { name: 'Afghan Afghani', decimals: 2, symbols: ['؋'], shared: [], regions: ['AF'] },

    AED: { name: 'UAE Dirham', decimals: 2, symbols: ['AED', 'Dhs', 'د.إ'], shared: [], regions: ['AE'] },
    SAR: { name: 'Saudi Riyal', decimals: 2, symbols: ['SAR', 'ر.س'], shared: ['﷼'], regions: ['SA'] },
    QAR: { name: 'Qatari Riyal', decimals: 2, symbols: ['QAR', 'ر.ق'], shared: ['﷼'], regions: ['QA'] },
    OMR: { name: 'Omani Rial', decimals: 3, symbols: ['OMR', 'ر.ع.'], shared: ['﷼'], regions: ['OM'] },
    YER: { name: 'Yemeni Rial', decimals: 2, symbols: ['YER'], shared: ['﷼'], regions: ['YE'] },
    IRR: { name: 'Iranian Rial', decimals: 2, symbols: ['IRR'], shared: ['﷼'], regions: ['IR'] },
    KWD: { name: 'Kuwaiti Dinar', decimals: 3, symbols: ['KWD', 'د.ك'], shared: [], regions: ['KW'] },
    BHD: { name: 'Bahraini Dinar', decimals: 3, symbols: ['BHD', 'د.ب'], shared: [], regions: ['BH'] },
    JOD: { name: 'Jordanian Dinar', decimals: 3, symbols: ['JOD', 'د.ا'], shared: [], regions: ['JO'] },
    IQD: { name: 'Iraqi Dinar', decimals: 3, symbols: ['IQD', 'ع.د'], shared: [], regions: ['IQ'] },
    LBP: { name: 'Lebanese Pound', decimals: 2, symbols: ['LBP', 'ل.ل'], shared: ['£'], regions: ['LB'] },
    SYP: { name: 'Syrian Pound', decimals: 2, symbols: ['SYP', 'ل.س'], shared: ['£'], regions: ['SY'] },
    ILS: { name: 'Israeli Shekel', decimals: 2, symbols: ['₪'], shared: [], regions: ['IL'] },
    EGP: { name: 'Egyptian Pound', decimals: 2, symbols: ['E£', 'ج.م'], shared: ['£'], regions: ['EG'] },
    LYD: { name: 'Libyan Dinar', decimals: 3, symbols: ['LYD', 'ل.د'], shared: [], regions: ['LY'] },
    TND: { name: 'Tunisian Dinar', decimals: 3, symbols: ['TND', 'د.ت'], shared: [], regions: ['TN'] },
    DZD: { name: 'Algerian Dinar', decimals: 2, symbols: ['DZD', 'د.ج'], shared: [], regions: ['DZ'] },
    MAD: { name: 'Moroccan Dirham', decimals: 2, symbols: ['MAD', 'د.م.'], shared: [], regions: ['MA'] },
    SDG: { name: 'Sudanese Pound', decimals: 2, symbols: ['SDG'], shared: ['£'], regions: ['SD'] },

    RUB: { name: 'Russian Ruble', decimals: 2, symbols: ['₽'], shared: [], regions: ['RU'] },
    TRY: { name: 'Turkish Lira', decimals: 2, symbols: ['₺'], shared: [], regions: ['TR'] },
    SEK: { name: 'Swedish Krona', decimals: 2, symbols: [], shared: ['kr'], regions: ['SE'] },
    NOK: { name: 'Norwegian Krone', decimals: 2, symbols: [], shared: ['kr'], regions: ['NO'] },
    DKK: { name: 'Danish Krone', decimals: 2, symbols: [], shared: ['kr'], regions: ['DK'] },
    ISK: { name: 'Icelandic Krona', decimals: 0, symbols: [], shared: ['kr'], regions: ['IS'] },
    FOK: { name: 'Faroese Krona', decimals: 2, symbols: [], shared: ['kr'], regions: ['FO'] },
    PLN: { name: 'Polish Zloty', decimals: 2, symbols: ['zł'], shared: [], regions: ['PL'] },
    CZK: { name: 'Czech Koruna', decimals: 2, symbols: ['Kč'], shared: [], regions: ['CZ'] },
    HUF: { name: 'Hungarian Forint', decimals: 0, symbols: ['Ft'], shared: [], regions: ['HU'] },
    RON: { name: 'Romanian Leu', decimals: 2, symbols: ['lei'], shared: [], regions: ['RO'] },
    BGN: { name: 'Bulgarian Lev', decimals: 2, symbols: ['лв'], shared: [], regions: ['BG'] },
    UAH: { name: 'Ukrainian Hryvnia', decimals: 2, symbols: ['₴', 'грн'], shared: [], regions: ['UA'] },
    BYN: { name: 'Belarusian Ruble', decimals: 2, symbols: [], shared: ['Br'], regions: ['BY'] },
    MDL: { name: 'Moldovan Leu', decimals: 2, symbols: ['MDL'], shared: [], regions: ['MD'] },
    RSD: { name: 'Serbian Dinar', decimals: 2, symbols: ['дин', 'RSD'], shared: [], regions: ['RS'] },
    MKD: { name: 'Macedonian Denar', decimals: 2, symbols: ['ден', 'MKD'], shared: [], regions: ['MK'] },
    BAM: { name: 'Bosnia-Herzegovina Mark', decimals: 2, symbols: ['BAM'], shared: [], regions: ['BA'] },
    ALL: { name: 'Albanian Lek', decimals: 2, symbols: ['Lek'], shared: [], regions: ['AL'] },
    HRK: { name: 'Croatian Kuna', decimals: 2, symbols: ['kn'], shared: [], regions: ['HRK'] },
    GEL: { name: 'Georgian Lari', decimals: 2, symbols: ['₾'], shared: [], regions: ['GE'] },
    AMD: { name: 'Armenian Dram', decimals: 2, symbols: ['֏'], shared: [], regions: ['AM'] },
    AZN: { name: 'Azerbaijani Manat', decimals: 2, symbols: ['₼'], shared: [], regions: ['AZ'] },
    KZT: { name: 'Kazakhstani Tenge', decimals: 2, symbols: ['₸'], shared: [], regions: ['KZ'] },
    KGS: { name: 'Kyrgyzstani Som', decimals: 2, symbols: ['KGS'], shared: [], regions: ['KG'] },
    TJS: { name: 'Tajikistani Somoni', decimals: 2, symbols: ['TJS'], shared: [], regions: ['TJ'] },
    TMT: { name: 'Turkmenistani Manat', decimals: 2, symbols: ['TMT'], shared: [], regions: ['TM'] },
    UZS: { name: 'Uzbekistani Som', decimals: 2, symbols: ['UZS'], shared: [], regions: ['UZ'] },
    GIP: { name: 'Gibraltar Pound', decimals: 2, symbols: [], shared: ['£'], regions: ['GI'] },
    GGP: { name: 'Guernsey Pound', decimals: 2, symbols: [], shared: ['£'], regions: ['GG'] },
    IMP: { name: 'Isle of Man Pound', decimals: 2, symbols: [], shared: ['£'], regions: ['IM'] },
    JEP: { name: 'Jersey Pound', decimals: 2, symbols: [], shared: ['£'], regions: ['JE'] },
    FKP: { name: 'Falkland Islands Pound', decimals: 2, symbols: [], shared: ['£'], regions: ['FK'] },
    SHP: { name: 'Saint Helena Pound', decimals: 2, symbols: [], shared: ['£'], regions: ['SH'] },

    BRL: { name: 'Brazilian Real', decimals: 2, symbols: ['R$'], shared: [], regions: ['BR'] },
    MXN: { name: 'Mexican Peso', decimals: 2, symbols: ['MX$', 'Mex$'], shared: ['$'], regions: ['MX'] },
    ARS: { name: 'Argentine Peso', decimals: 2, symbols: ['AR$'], shared: ['$'], regions: ['AR'] },
    CLP: { name: 'Chilean Peso', decimals: 0, symbols: ['CLP$'], shared: ['$'], regions: ['CL'] },
    CLF: { name: 'Chilean Unit of Account', decimals: 4, symbols: ['UF'], shared: [], regions: ['CLF'] },
    COP: { name: 'Colombian Peso', decimals: 0, symbols: ['COL$', 'COP$'], shared: ['$'], regions: ['CO'] },
    PEN: { name: 'Peruvian Sol', decimals: 2, symbols: ['S/', 'S/.'], shared: [], regions: ['PE'] },
    BOB: { name: 'Bolivian Boliviano', decimals: 2, symbols: ['Bs.', 'Bs'], shared: [], regions: ['BO'] },
    PYG: { name: 'Paraguayan Guarani', decimals: 0, symbols: ['₲'], shared: [], regions: ['PY'] },
    UYU: { name: 'Uruguayan Peso', decimals: 2, symbols: ['$U'], shared: ['$'], regions: ['UY'] },
    VES: { name: 'Venezuelan Bolivar', decimals: 2, symbols: ['Bs.S', 'VES'], shared: [], regions: ['VE'] },
    GYD: { name: 'Guyanaese Dollar', decimals: 2, symbols: ['G$'], shared: ['$'], regions: ['GY'] },
    SRD: { name: 'Surinamese Dollar', decimals: 2, symbols: ['Sr$'], shared: ['$'], regions: ['SR'] },
    CRC: { name: 'Costa Rican Colon', decimals: 2, symbols: ['₡'], shared: [], regions: ['CR'] },
    GTQ: { name: 'Guatemalan Quetzal', decimals: 2, symbols: ['GTQ'], shared: [], regions: ['GT'] },
    HNL: { name: 'Honduran Lempira', decimals: 2, symbols: ['HNL'], shared: [], regions: ['HN'] },
    NIO: { name: 'Nicaraguan Cordoba', decimals: 2, symbols: ['NIO'], shared: ['C$'], regions: ['NI'] },
    PAB: { name: 'Panamanian Balboa', decimals: 2, symbols: ['B/.'], shared: [], regions: ['PA'] },
    DOP: { name: 'Dominican Peso', decimals: 2, symbols: ['RD$'], shared: ['$'], regions: ['DO'] },
    CUP: { name: 'Cuban Peso', decimals: 2, symbols: ['CUP'], shared: ['$'], regions: ['CU'] },
    HTG: { name: 'Haitian Gourde', decimals: 2, symbols: ['HTG'], shared: [], regions: ['HT'] },
    JMD: { name: 'Jamaican Dollar', decimals: 2, symbols: ['J$'], shared: ['$'], regions: ['JM'] },
    TTD: { name: 'Trinidad and Tobago Dollar', decimals: 2, symbols: ['TT$'], shared: ['$'], regions: ['TT'] },
    BBD: { name: 'Barbadian Dollar', decimals: 2, symbols: ['Bds$'], shared: ['$'], regions: ['BB'] },
    BSD: { name: 'Bahamian Dollar', decimals: 2, symbols: [], shared: ['$', 'B$'], regions: ['BS'] },
    BZD: { name: 'Belize Dollar', decimals: 2, symbols: ['BZ$'], shared: ['$'], regions: ['BZ'] },
    BMD: { name: 'Bermudan Dollar', decimals: 2, symbols: ['BD$'], shared: ['$'], regions: ['BM'] },
    KYD: { name: 'Cayman Islands Dollar', decimals: 2, symbols: ['CI$'], shared: ['$'], regions: ['KY'] },
    XCD: { name: 'East Caribbean Dollar', decimals: 2, symbols: ['EC$'], shared: ['$'], regions: ['AG', 'DM', 'GD', 'KN', 'LC', 'VC'] },
    AWG: { name: 'Aruban Florin', decimals: 2, symbols: ['Afl.'], shared: ['ƒ'], regions: ['AW'] },
    ANG: { name: 'Netherlands Antillean Guilder', decimals: 2, symbols: ['NAf'], shared: ['ƒ'], regions: ['ANG'] },
    XCG: { name: 'Caribbean Guilder', decimals: 2, symbols: ['XCG'], shared: ['ƒ'], regions: ['CW', 'SX'] },

    ZAR: { name: 'South African Rand', decimals: 2, symbols: [], shared: [], regions: ['ZA'] },
    NGN: { name: 'Nigerian Naira', decimals: 2, symbols: ['₦'], shared: [], regions: ['NG'] },
    GHS: { name: 'Ghanaian Cedi', decimals: 2, symbols: ['GH₵', '₵'], shared: [], regions: ['GH'] },
    KES: { name: 'Kenyan Shilling', decimals: 2, symbols: ['KSh'], shared: [], regions: ['KE'] },
    TZS: { name: 'Tanzanian Shilling', decimals: 2, symbols: ['TSh'], shared: [], regions: ['TZ'] },
    UGX: { name: 'Ugandan Shilling', decimals: 0, symbols: ['USh'], shared: [], regions: ['UG'] },
    ETB: { name: 'Ethiopian Birr', decimals: 2, symbols: [], shared: ['Br'], regions: ['ET'] },
    SOS: { name: 'Somali Shilling', decimals: 2, symbols: ['SOS'], shared: [], regions: ['SO'] },
    ZMW: { name: 'Zambian Kwacha', decimals: 2, symbols: ['ZK'], shared: [], regions: ['ZM'] },
    MWK: { name: 'Malawian Kwacha', decimals: 2, symbols: ['MWK'], shared: [], regions: ['MW'] },
    BWP: { name: 'Botswanan Pula', decimals: 2, symbols: ['BWP'], shared: [], regions: ['BW'] },
    NAD: { name: 'Namibian Dollar', decimals: 2, symbols: ['N$'], shared: ['$'], regions: ['NA'] },
    MZN: { name: 'Mozambican Metical', decimals: 2, symbols: ['MZN'], shared: [], regions: ['MZ'] },
    AOA: { name: 'Angolan Kwanza', decimals: 2, symbols: ['Kz'], shared: [], regions: ['AO'] },
    CDF: { name: 'Congolese Franc', decimals: 2, symbols: ['CDF'], shared: [], regions: ['CD'] },
    RWF: { name: 'Rwandan Franc', decimals: 0, symbols: ['FRw'], shared: [], regions: ['RW'] },
    BIF: { name: 'Burundian Franc', decimals: 0, symbols: ['FBu'], shared: [], regions: ['BI'] },
    DJF: { name: 'Djiboutian Franc', decimals: 0, symbols: ['Fdj'], shared: [], regions: ['DJ'] },
    KMF: { name: 'Comorian Franc', decimals: 0, symbols: ['KMF'], shared: [], regions: ['KM'] },
    GNF: { name: 'Guinean Franc', decimals: 0, symbols: ['FG'], shared: [], regions: ['GN'] },
    XOF: { name: 'West African CFA Franc', decimals: 0, symbols: [], shared: ['CFA', 'F.CFA'], regions: ['SN', 'CI', 'ML', 'BF', 'NE', 'TG', 'BJ', 'GW'] },
    XAF: { name: 'Central African CFA Franc', decimals: 0, symbols: [], shared: ['CFA', 'F.CFA'], regions: ['CM', 'CF', 'TD', 'CG', 'GQ', 'GA'] },
    MGA: { name: 'Malagasy Ariary', decimals: 2, symbols: ['Ar'], shared: [], regions: ['MG'] },
    MUR: { name: 'Mauritian Rupee', decimals: 2, symbols: [], shared: ['₨', 'Rs', 'Rs.'], regions: ['MU'] },
    SCR: { name: 'Seychellois Rupee', decimals: 2, symbols: ['SCR'], shared: ['₨', 'Rs', 'Rs.'], regions: ['SC'] },
    MRU: { name: 'Mauritanian Ouguiya', decimals: 2, symbols: ['UM'], shared: [], regions: ['MR'] },
    CVE: { name: 'Cape Verdean Escudo', decimals: 2, symbols: ['CVE', 'Esc'], shared: [], regions: ['CV'] },
    STN: { name: 'Sao Tome and Principe Dobra', decimals: 2, symbols: ['Db'], shared: [], regions: ['ST'] },
    GMD: { name: 'Gambian Dalasi', decimals: 2, symbols: ['GMD'], shared: [], regions: ['GM'] },
    SLE: { name: 'Sierra Leonean Leone', decimals: 2, symbols: [], shared: ['Le'], regions: ['SL'] },
    SLL: { name: 'Sierra Leonean Leone (old)', decimals: 2, symbols: [], shared: ['Le'], regions: ['SLL'] },
    LRD: { name: 'Liberian Dollar', decimals: 2, symbols: ['L$'], shared: ['$'], regions: ['LR'] },
    ERN: { name: 'Eritrean Nakfa', decimals: 2, symbols: ['Nfk'], shared: [], regions: ['ER'] },
    SSP: { name: 'South Sudanese Pound', decimals: 2, symbols: ['SSP'], shared: ['£'], regions: ['SS'] },
    SZL: { name: 'Swazi Lilangeni', decimals: 2, symbols: ['SZL'], shared: [], regions: ['SZ'] },
    LSL: { name: 'Lesotho Loti', decimals: 2, symbols: ['LSL'], shared: [], regions: ['LS'] },
    ZWL: { name: 'Zimbabwean Dollar', decimals: 2, symbols: [], shared: ['Z$'], regions: ['ZW'] },
    ZWG: { name: 'Zimbabwe Gold', decimals: 2, symbols: ['ZiG'], shared: ['Z$'], regions: ['ZWG'] },

    THB: { name: 'Thai Baht', decimals: 2, symbols: ['฿'], shared: [], regions: ['TH'] },
    VND: { name: 'Vietnamese Dong', decimals: 0, symbols: ['₫'], shared: [], regions: ['VN'] },
    IDR: { name: 'Indonesian Rupiah', decimals: 0, symbols: ['Rp'], shared: [], regions: ['ID'] },
    MYR: { name: 'Malaysian Ringgit', decimals: 2, symbols: ['RM'], shared: [], regions: ['MY'] },
    PHP: { name: 'Philippine Peso', decimals: 2, symbols: ['₱'], shared: [], regions: ['PH'] },
    FJD: { name: 'Fijian Dollar', decimals: 2, symbols: ['FJ$'], shared: ['$'], regions: ['FJ'] },
    PGK: { name: 'Papua New Guinean Kina', decimals: 2, symbols: ['PGK'], shared: [], regions: ['PG'] },
    SBD: { name: 'Solomon Islands Dollar', decimals: 2, symbols: ['SI$'], shared: ['$'], regions: ['SB'] },
    VUV: { name: 'Vanuatu Vatu', decimals: 0, symbols: ['VUV'], shared: [], regions: ['VU'] },
    WST: { name: 'Samoan Tala', decimals: 2, symbols: ['WS$'], shared: ['$'], regions: ['WS'] },
    TOP: { name: 'Tongan Paanga', decimals: 2, symbols: ['T$'], shared: [], regions: ['TO'] },
    XPF: { name: 'CFP Franc', decimals: 0, symbols: ['CFP'], shared: [], regions: ['PF', 'NC', 'WF'] },
    KID: { name: 'Kiribati Dollar', decimals: 2, symbols: [], shared: ['$'], regions: ['KI'] },
    TVD: { name: 'Tuvaluan Dollar', decimals: 2, symbols: [], shared: ['$'], regions: ['TV'] },

    XDR: { name: 'IMF Special Drawing Rights', decimals: 2, symbols: ['SDR'], shared: [], regions: ['XDR'] }
  };

  const RISKY_CODES = new Set([
    'ALL', 'TOP', 'AMD', 'SOS', 'END', 'CUP', 'BAM', 'LAK', 'WST',
    'MOP', 'GEL', 'BOB', 'KID', 'IMP', 'PEN', 'TRY'
  ]);

  const AMBIGUOUS_DEFAULTS = {
    '$': 'USD',
    '¥': 'JPY',
    '￥': 'JPY',
    '£': 'GBP',
    'kr': 'SEK',
    '₨': 'INR',
    'Rs': 'INR',
    'Rs.': 'INR',
    '﷼': 'SAR',
    'C$': 'CAD',
    'B$': 'BSD',
    'Br': 'BYN',
    'Le': 'SLE',
    'Z$': 'ZWL',
    'ƒ': 'ANG',
    'CFA': 'XOF',
    'F.CFA': 'XOF'
  };

  const TLD_CURRENCY = {
    jp: 'JPY', uk: 'GBP', ca: 'CAD', au: 'AUD', nz: 'NZD', cn: 'CNY', hk: 'HKD',
    tw: 'TWD', kr: 'KRW', in: 'INR', br: 'BRL', mx: 'MXN', ar: 'ARS', cl: 'CLP',
    co: 'COP', pe: 'PEN', ch: 'CHF', se: 'SEK', no: 'NOK', dk: 'DKK', is: 'ISK',
    pl: 'PLN', cz: 'CZK', hu: 'HUF', ro: 'RON', bg: 'BGN', ua: 'UAH', ru: 'RUB',
    tr: 'TRY', za: 'ZAR', ng: 'NGN', eg: 'EGP', il: 'ILS', ae: 'AED', sa: 'SAR',
    th: 'THB', vn: 'VND', id: 'IDR', my: 'MYR', ph: 'PHP', pk: 'PKR', sg: 'SGD',
    qa: 'QAR', kw: 'KWD', bh: 'BHD', om: 'OMR', jo: 'JOD', lb: 'LBP', iq: 'IQD',
    ir: 'IRR', ye: 'YER', sy: 'SYP', ly: 'LYD', tn: 'TND', dz: 'DZD', ma: 'MAD',
    ke: 'KES', tz: 'TZS', ug: 'UGX', gh: 'GHS', et: 'ETB', mz: 'MZN', ao: 'AOA',
    zm: 'ZMW', zw: 'ZWL', bw: 'BWP', na: 'NAD', mu: 'MUR', mo: 'MOP', mn: 'MNT',
    kh: 'KHR', la: 'LAK', mm: 'MMK', bn: 'BND', bd: 'BDT', lk: 'LKR', np: 'NPR',
    af: 'AFN', kz: 'KZT', uz: 'UZS', ge: 'GEL', am: 'AMD', az: 'AZN', by: 'BYN',
    md: 'MDL', rs: 'RSD', mk: 'MKD', ba: 'BAM', al: 'ALL', ve: 'VES', bo: 'BOB',
    py: 'PYG', uy: 'UYU', cr: 'CRC', gt: 'GTQ', hn: 'HNL', ni: 'NIO', pa: 'PAB',
    do: 'DOP', jm: 'JMD', tt: 'TTD', bs: 'BSD', bz: 'BZD', bm: 'BMD', ky: 'KYD',
    fj: 'FJD', pg: 'PGK', sb: 'SBD', vu: 'VUV', ws: 'WST', to: 'TOP',
    de: 'EUR', fr: 'EUR', es: 'EUR', it: 'EUR', nl: 'EUR', be: 'EUR', at: 'EUR',
    pt: 'EUR', ie: 'EUR', fi: 'EUR', gr: 'EUR', eu: 'EUR', us: 'USD'
  };

  const REGION_CURRENCY = (function () {
    const map = {};
    for (const code of Object.keys(CURRENCIES)) {
      for (const region of CURRENCIES[code].regions || []) {
        if (!map[region]) map[region] = code;
      }
    }
    return map;
  })();

  const ALL_CODES = Object.keys(CURRENCIES).sort();

  const SYMBOL_INDEX = (function () {
    const index = new Map();
    const add = (symbol, code) => {
      const key = symbol.trim();
      if (!key) return;
      if (!index.has(key)) index.set(key, []);
      const list = index.get(key);
      if (!list.includes(code)) list.push(code);
    };
    for (const code of ALL_CODES) {
      for (const symbol of CURRENCIES[code].symbols) add(symbol, code);
      for (const symbol of CURRENCIES[code].shared) add(symbol, code);
    }
    for (const [symbol, preferred] of Object.entries(AMBIGUOUS_DEFAULTS)) {
      const list = index.get(symbol);
      if (list && list.includes(preferred)) {
        list.splice(list.indexOf(preferred), 1);
        list.unshift(preferred);
      }
    }
    return index;
  })();

  const SYMBOL_TOKENS = Array.from(SYMBOL_INDEX.keys())
    .concat(['¥', '￥', '$', '£', 'kr', 'Kr', 'KR', '₨', '﷼'])
    .filter((value, i, arr) => arr.indexOf(value) === i)
    .sort((a, b) => b.length - a.length || a.localeCompare(b));

  const MATCHABLE_CODES = ALL_CODES.filter((code) => !RISKY_CODES.has(code));

  const SYMBOL_ALIASES = { '￥': '¥', '￦': '₩', '₨': 'Rs', 'Rs.': 'Rs', 'S/.': 'S/', 'F.CFA': 'CFA' };

  function normalizeSymbol(symbolRaw) {
    const key = String(symbolRaw || '').trim();
    return SYMBOL_ALIASES[key] || key;
  }

  const AMBIGUOUS_SYMBOLS = Array.from(SYMBOL_INDEX.entries())
    .filter(([symbol, list]) => list.length > 1 && !SYMBOL_ALIASES[symbol])
    .map(([symbol]) => symbol);

  function isKnown(code) {
    return Object.prototype.hasOwnProperty.call(CURRENCIES, String(code || '').toUpperCase());
  }

  function get(code) {
    return CURRENCIES[String(code || '').toUpperCase()] || null;
  }

  function decimalsFor(code) {
    const entry = get(code);
    return entry ? entry.decimals : 2;
  }

  function nameFor(code) {
    const entry = get(code);
    return entry ? entry.name : String(code || '');
  }

  function candidatesFor(symbolRaw) {
    if (!symbolRaw) return [];
    const key = String(symbolRaw).trim();
    if (SYMBOL_INDEX.has(key)) return SYMBOL_INDEX.get(key).slice();
    const upper = key.toUpperCase();
    if (isKnown(upper)) return [upper];
    for (const [symbol, list] of SYMBOL_INDEX.entries()) {
      if (symbol.toLowerCase() === key.toLowerCase()) return list.slice();
    }
    return [];
  }

  function resolve(symbolRaw, context) {
    const ctx = context || {};
    const candidates = candidatesFor(symbolRaw);
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    if (ctx.forced && candidates.includes(ctx.forced)) return ctx.forced;
    if (ctx.pageCurrency && candidates.includes(ctx.pageCurrency)) return ctx.pageCurrency;

    const key = normalizeSymbol(symbolRaw);
    const userDefaults = ctx.symbolDefaults || {};
    if (userDefaults[key] && candidates.includes(userDefaults[key])) return userDefaults[key];

    const lower = key.toLowerCase();
    for (const [symbol, code] of Object.entries(userDefaults)) {
      if (symbol.toLowerCase() === lower && candidates.includes(code)) return code;
    }
    return candidates[0];
  }

  function currencyForRegion(region) {
    return REGION_CURRENCY[String(region || '').toUpperCase()] || null;
  }

  function currencyForTld(hostname) {
    const parts = String(hostname || '').toLowerCase().split('.');
    const tld = parts[parts.length - 1];
    return TLD_CURRENCY[tld] || null;
  }

  function currencyForLocale(locale) {
    const tag = String(locale || '');
    const match = tag.match(/[-_]([A-Za-z]{2})\b/);
    if (match) {
      const byRegion = currencyForRegion(match[1]);
      if (byRegion) return byRegion;
    }
    const lang = tag.split(/[-_]/)[0].toLowerCase();
    const byLanguage = { ja: 'JPY', ko: 'KRW', zh: 'CNY', en: 'USD', de: 'EUR', fr: 'EUR', it: 'EUR', nl: 'EUR', fi: 'EUR', el: 'EUR', ga: 'EUR', es: 'EUR', pt: 'BRL', ru: 'RUB', tr: 'TRY', th: 'THB', vi: 'VND', hi: 'INR', id: 'IDR', ms: 'MYR', pl: 'PLN', cs: 'CZK', hu: 'HUF', ro: 'RON', sv: 'SEK', nb: 'NOK', no: 'NOK', da: 'DKK', is: 'ISK', he: 'ILS', ar: 'AED', fa: 'IRR', ur: 'PKR', uk: 'UAH', bg: 'BGN', tl: 'PHP', bn: 'BDT', km: 'KHR', my: 'MMK', ne: 'NPR', si: 'LKR', am: 'ETB', sw: 'KES', az: 'AZN', ka: 'GEL', hy: 'AMD', kk: 'KZT', uz: 'UZS', mn: 'MNT', sr: 'RSD', mk: 'MKD', sq: 'ALL' };
    return byLanguage[lang] || null;
  }

  const api = {
    CURRENCIES,
    ALL_CODES,
    MATCHABLE_CODES,
    SYMBOL_TOKENS,
    SYMBOL_INDEX,
    SYMBOL_ALIASES,
    AMBIGUOUS_SYMBOLS,
    AMBIGUOUS_DEFAULTS,
    TLD_CURRENCY,
    RISKY_CODES,
    isKnown,
    get,
    decimalsFor,
    nameFor,
    candidatesFor,
    normalizeSymbol,
    resolve,
    currencyForRegion,
    currencyForTld,
    currencyForLocale
  };

  root.Kawase = Object.assign(root.Kawase || {}, { currencies: api });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
